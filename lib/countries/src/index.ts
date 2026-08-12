import countries from "i18n-iso-countries";
import arLocale from "i18n-iso-countries/langs/ar.json";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(arLocale as never);
countries.registerLocale(enLocale as never);

export interface CountryOption {
  /** ISO 3166-1 alpha-2 code, e.g. "SA" */
  code: string;
  nameAr: string;
  nameEn: string;
  /** Unicode flag emoji, e.g. 🇸🇦 */
  flag: string;
}

function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

const alpha2Names = countries.getNames("en", { select: "official" });

export const COUNTRIES: CountryOption[] = Object.keys(alpha2Names)
  .map((code) => ({
    code,
    nameEn: countries.getName(code, "en") ?? code,
    nameAr: countries.getName(code, "ar") ?? countries.getName(code, "en") ?? code,
    flag: flagEmoji(code),
  }))
  .sort((a, b) => a.nameEn.localeCompare(b.nameEn));

export function getCountryByCode(code?: string | null): CountryOption | undefined {
  if (!code) return undefined;
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}

export function getCountryByName(name?: string | null): CountryOption | undefined {
  if (!name) return undefined;
  const normalized = name.trim().toLocaleLowerCase();
  return COUNTRIES.find(
    (c) => c.nameAr.toLocaleLowerCase() === normalized || c.nameEn.toLocaleLowerCase() === normalized,
  );
}

// ── Canonicalization ────────────────────────────────────────────────────────
// Common abbreviations / alternate spellings mapped to ISO alpha-2 codes.
// Used so legacy free-text values ("UAE", "KSA", …) resolve to one canonical country.
const COUNTRY_ALIASES: Record<string, string> = {
  uae: "AE",
  "u.a.e": "AE",
  "u.a.e.": "AE",
  emirates: "AE",
  ksa: "SA",
  "k.s.a": "SA",
  "saudi": "SA",
  usa: "US",
  "u.s.a": "US",
  "u.s.a.": "US",
  "united states of america": "US",
  america: "US",
  uk: "GB",
  "u.k": "GB",
  "u.k.": "GB",
  britain: "GB",
  "great britain": "GB",
  england: "GB",
  czechia: "CZ",
  "czech republic": "CZ",
  russia: "RU",
  "russian federation": "RU",
  "south korea": "KR",
  "korea, republic of": "KR",
  "north korea": "KP",
  syria: "SY",
  "syrian arab republic": "SY",
  iran: "IR",
  "iran, islamic republic of": "IR",
  vietnam: "VN",
  "viet nam": "VN",
  laos: "LA",
  moldova: "MD",
  bolivia: "BO",
  venezuela: "VE",
  tanzania: "TZ",
  brunei: "BN",
  "dr congo": "CD",
  "democratic republic of the congo": "CD",
  "congo-kinshasa": "CD",
  congo: "CG",
  "cape verde": "CV",
  "ivory coast": "CI",
  "côte d'ivoire": "CI",
  "cote d'ivoire": "CI",
  turkey: "TR",
  türkiye: "TR",
  palestine: "PS",
  "palestinian territories": "PS",
  macedonia: "MK",
  "north macedonia": "MK",
  burma: "MM",
  myanmar: "MM",
  taiwan: "TW",
  "timor-leste": "TL",
  "east timor": "TL",
  eswatini: "SZ",
  swaziland: "SZ",
};

/**
 * Resolve any country input (ISO alpha-2 code, English name, Arabic name,
 * or common alias like "UAE") to its ISO alpha-2 code, or undefined.
 */
export function canonicalCountryCode(input?: string | null): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  // ISO alpha-2 code
  if (/^[A-Za-z]{2}$/.test(trimmed) && getCountryByCode(trimmed)) return trimmed.toUpperCase();
  // Alias table
  const alias = COUNTRY_ALIASES[trimmed.toLocaleLowerCase()];
  if (alias) return alias;
  // Exact English/Arabic name
  const byName = getCountryByName(trimmed);
  if (byName) return byName.code;
  // Any name variant known to i18n-iso-countries (official/alias names)
  const viaLib = countries.getAlpha2Code(trimmed, "en") ?? countries.getAlpha2Code(trimmed, "ar");
  return viaLib ?? undefined;
}

/**
 * Resolve any country input to the canonical English name used across the app,
 * or undefined when it cannot be recognized.
 */
export function canonicalCountryEn(input?: string | null): string | undefined {
  const code = canonicalCountryCode(input);
  return code ? getCountryByCode(code)?.nameEn : undefined;
}

/**
 * Exact-match country comparison on canonical values (never substring).
 * Unrecognized values only match when the raw strings are identical
 * after trimming and case-folding.
 */
export function isSameCountry(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const ca = canonicalCountryCode(a);
  const cb = canonicalCountryCode(b);
  if (ca && cb) return ca === cb;
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

/** Canonical GCC country list (English names as produced by this library). */
export const GCC_COUNTRY_CODES = ["SA", "AE", "KW", "QA", "BH", "OM"] as const;
export const GCC_COUNTRIES: CountryOption[] = GCC_COUNTRY_CODES.map(
  (code) => getCountryByCode(code)!,
);
