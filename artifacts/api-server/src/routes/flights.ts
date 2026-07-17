import { Router } from "express";
import { z } from "zod";
import { searchFlights } from "../services/FlightSearchService";
import { ProviderRegistry } from "../providers/ProviderRegistry";
import { db } from "@workspace/db";
import { flightSearchesTable, flightSearchLegsTable, bookingsTable } from "@workspace/db";
import { duffelGet, duffelPost, hasDuffelCredentials } from "../providers/duffel/DuffelClient";
import type { DuffelOffer, DuffelOfferPassenger } from "../providers/duffel/DuffelMapper";
import { optionalAuth } from "../middleware/auth";

const router = Router();

const flightSearchSchema = z.object({
  tripType: z.enum(["one_way", "round_trip", "multi_city"]).default("one_way"),
  cabinClass: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
  adults: z.coerce.number().int().min(1).max(9).default(1),
  children: z.coerce.number().int().min(0).max(8).default(0),
  infants: z.coerce.number().int().min(0).max(4).default(0),
  currency: z.string().length(3).default("USD"),
  // Single leg (one_way / round_trip)
  origin: z.string().length(3).toUpperCase().optional(),
  destination: z.string().length(3).toUpperCase().optional(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Multi-city: JSON encoded array of {origin, destination, departureDate}
  legs: z.string().optional(),
  sort: z.enum(["cheapest", "fastest", "best_value"]).default("cheapest"),
});

// GET /api/flights/search
router.get("/flights/search", async (req, res) => {
  try {
    const query = flightSearchSchema.parse(req.query);

    // Build legs array
    let legs: Array<{ originIata: string; destinationIata: string; departureDate: string }> = [];

    if (query.legs) {
      try {
        legs = JSON.parse(query.legs);
      } catch {
        return res.status(400).json({ error: "Invalid legs JSON" });
      }
    } else {
      if (!query.origin || !query.destination || !query.departureDate) {
        return res.status(400).json({
          error: "origin, destination, and departureDate are required (or use legs for multi-city)",
        });
      }
      legs = [{ originIata: query.origin, destinationIata: query.destination, departureDate: query.departureDate }];
      if (query.tripType === "round_trip" && query.returnDate) {
        legs.push({ originIata: query.destination, destinationIata: query.origin, departureDate: query.returnDate });
      }
    }

    const params = {
      tripType: query.tripType,
      cabinClass: query.cabinClass,
      adults: query.adults,
      children: query.children,
      infants: query.infants,
      currency: query.currency,
      legs,
    };

    const results = await searchFlights(params);

    // Persist search record (non-blocking)
    persistSearch(params, req.ip, results.searchHash).catch(() => {});

    // Return results sorted by requested mode
    const sortedKey = query.sort === "fastest" ? "fastest" : query.sort === "best_value" ? "bestValue" : "cheapest";
    res.json({
      searchHash: results.searchHash,
      cachedAt: results.cachedAt,
      totalResults: results.allOffers.length,
      providerSummary: results.providerSummary,
      offers: results[sortedKey],
    });
  } catch (e) {
    req.log.error(e);
    if (e instanceof z.ZodError) return res.status(400).json({ error: "Invalid parameters", details: e.issues });
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/flights/providers — list all registered providers and their status
router.get("/flights/providers", (_req, res) => {
  const providers = ProviderRegistry.getAllFlightProviders().map((p) => ({
    slug: p.slug,
    name: p.name,
    supportsBooking: p.supportsBooking,
    isAvailable: p.isAvailable(),
  }));
  res.json(providers);
});

interface BookPassenger {
  givenName: string;
  familyName: string;
  title?: string;
  gender?: string;
  dob: string;
  email: string;
  phone: string;
  passport?: string;
  nationality?: string;
}

// POST /api/flights/book — create a real Duffel order or a pending booking request
router.post("/flights/book", optionalAuth, async (req, res) => {
  try {
    const { providerSlug, providerOfferId, passengers, adults, children, totalPrice, currency, destination, travelDate } = req.body as {
      providerSlug: string;
      providerOfferId: string;
      passengers: BookPassenger[];
      adults?: number;
      children?: number;
      totalPrice?: number;
      currency?: string;
      destination?: string;
      travelDate?: string;
    };

    if (!providerOfferId || !Array.isArray(passengers) || passengers.length === 0) {
      return res.status(400).json({ error: "providerOfferId and passengers[] are required" });
    }

    const userId = (req as Record<string, unknown> & { user?: { sub?: string } }).user?.sub ?? null;
    const p0 = passengers[0];
    const clientName = `${p0.givenName ?? ""} ${p0.familyName ?? ""}`.trim() || "—";

    // ── Real Duffel booking ──────────────────────────────────────────────────
    const isDuffelOffer = providerSlug === "duffel" && providerOfferId.startsWith("off_") && hasDuffelCredentials();

    if (isDuffelOffer) {
      // 1. Fetch fresh offer to get passenger IDs + current price
      type DuffelOfferFull = DuffelOffer & {
        passengers: DuffelOfferPassenger[];
        slices: Array<{
          segments: Array<{
            departing_at: string;
            origin: { iata_code: string; city_name?: string };
            destination: { iata_code: string; city_name?: string };
          }>;
        }>;
      };

      const offerResp = await duffelGet<{ data: DuffelOfferFull }>(`/air/offers/${providerOfferId}`);
      const offer = offerResp.data;
      const offerPassengers: DuffelOfferPassenger[] = offer.passengers ?? [];

      // 2. Map our passenger details → Duffel passenger objects (match by index)
      const duffelPassengers = passengers
        .map((p, i) => {
          const pid = offerPassengers[i]?.id;
          if (!pid) return null;
          return {
            id: pid,
            given_name: p.givenName,
            family_name: p.familyName,
            born_on: p.dob,
            title: p.title || "mr",
            gender: p.gender || "m",
            email: p.email,
            phone_number: p.phone,
          };
        })
        .filter(Boolean);

      if (duffelPassengers.length === 0) {
        return res.status(400).json({ error: "Offer has no passenger IDs — it may have expired" });
      }

      // 3. Create the Duffel order
      type DuffelOrderResp = {
        data: { id: string; booking_reference: string; total_amount: string; total_currency: string };
      };
      const orderResp = await duffelPost<DuffelOrderResp>("/air/orders", {
        data: {
          selected_offers: [providerOfferId],
          payments: [{ type: "balance", currency: offer.total_currency, amount: offer.total_amount }],
          passengers: duffelPassengers,
          metadata: { source: "absher-travel" },
        },
      });
      const order = orderResp.data;

      // 4. Derive route info from offer slices
      const firstSeg = offer.slices[0]?.segments[0];
      const lastSlice = offer.slices[offer.slices.length - 1];
      const lastSeg = lastSlice?.segments[lastSlice.segments.length - 1];
      const routeStr = firstSeg && lastSeg
        ? `${firstSeg.origin.city_name ?? firstSeg.origin.iata_code} → ${lastSeg.destination.city_name ?? lastSeg.destination.iata_code}`
        : (destination ?? undefined);

      // 5. Persist to DB as confirmed
      const [dbRow] = await db.insert(bookingsTable).values({
        type: "flight",
        userId,
        clientName,
        clientPhone: p0.phone ?? "—",
        clientEmail: p0.email,
        destination: routeStr,
        travelDate: firstSeg?.departing_at?.slice(0, 10) ?? travelDate,
        adults: adults ?? 1,
        children: children ?? 0,
        totalPrice: offer.total_amount,
        notes: `Duffel Order: ${order.id} | PNR: ${order.booking_reference}`,
        status: "confirmed",
      }).returning();

      return res.json({
        bookingId: dbRow.id,
        orderId: order.id,
        bookingReference: order.booking_reference,
        totalAmount: order.total_amount,
        totalCurrency: order.total_currency,
      });
    }

    // ── Fallback: save pending booking request (non-Duffel or mock offers) ───
    const [dbRow] = await db.insert(bookingsTable).values({
      type: "flight",
      userId,
      clientName,
      clientPhone: p0.phone ?? "—",
      clientEmail: p0.email,
      destination,
      travelDate,
      adults: adults ?? 1,
      children: children ?? 0,
      totalPrice: totalPrice ? String(totalPrice) : undefined,
      notes: `Offer: ${providerSlug}:${providerOfferId}`,
      status: "pending",
    }).returning();

    return res.json({
      bookingId: dbRow.id,
      orderId: null,
      bookingReference: `ABT${String(dbRow.id).padStart(6, "0")}`,
    });
  } catch (err) {
    req.log.error({ err }, "POST /flights/book error");
    res.status(500).json({ error: "Booking failed", details: err instanceof Error ? err.message : String(err) });
  }
});

async function persistSearch(
  params: Parameters<typeof searchFlights>[0],
  ip: string | undefined,
  hash: string,
) {
  const [search] = await db.insert(flightSearchesTable).values({
    tripType: params.tripType,
    cabinClass: params.cabinClass,
    adults: params.adults,
    children: params.children,
    infants: params.infants,
    currency: params.currency,
    searchHash: hash,
    ipAddress: ip,
  }).returning();

  for (const [i, leg] of params.legs.entries()) {
    await db.insert(flightSearchLegsTable).values({
      searchId: search.id,
      legOrder: i,
      originIata: leg.originIata,
      destinationIata: leg.destinationIata,
      departureDate: leg.departureDate,
    });
  }
}

export default router;
