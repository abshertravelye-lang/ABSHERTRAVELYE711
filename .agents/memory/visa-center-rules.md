---
name: Visa Center production rules
description: Auth gate, profile completeness, eligibility, tracking format, Coming Soon pages — all production requirements for the Visa Center feature.
---

## Core rules (do not break)

**Auth gate:** `POST /api/visa-applications` requires `requireAuth` (not `optionalAuth`). Any unauthenticated attempt returns 401.

**Profile completeness (backend enforced):** `isProfileComplete()` in `artifacts/api-server/src/routes/auth.ts` checks: firstName/lastName, nationality, dateOfBirth, gender, phone, profilePhotoUrl, passportNumber, passportExpiryDate, passportImageUrl. If isGccResident→gccResidenceCountry+gccResidenceFrontUrl. If isEuropeanResident→europeanDocumentUrl. Returns 422 with `profileIncomplete: true` if incomplete.

**Server-side eligibility:** The backend uses STORED profile for all eligibility checks — it never trusts client-sent nationality/residency. `checkEligibility()` in `visaApplications.ts` checks: blocked nationalities first (cannot be overridden), then allowed list, then GCC/Schengen residency requirements.

**Tracking number format:** `AT-YYYY-NNNNNN` (e.g. `AT-2026-047832`). Old format `VISA-YYYY-######` is deprecated.

**Eligibility pre-check:** `GET /api/visa-applications/eligibility/:visaId` (requireAuth) — returns `{eligible, reason, profileIncomplete?}` before submission.

**Coming Soon:** Flights (`/flights`) and Hotels (`/hotels`) show styled Coming Soon pages — no flight search, no booking, no 404. Both web and mobile.

## DB schema additions (already migrated)
Users table has: `is_european_resident` (bool), `european_document_type` (text), `european_document_url` (text), `european_document_expiry` (date), `profile_completed_at` (timestamptz).

## Apply flow (web)
1. `visa-view.tsx` Apply button → calls `handleApply()` → checks auth, profile complete, then calls eligibility endpoint → navigates to `/visas/apply/:id`
2. `visa-apply.tsx` → auth gate at mount (redirect to login), profile completeness check, displays stored profile data (read-only), collects only custom fields + agreement → submits `{visaId, customFieldResponses, agreedToTerms}`
3. Backend loads everything else from stored profile — user never re-enters name/passport/residency

## GCC country dropdown
6 countries in order: Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, Oman. Must be dropdown (Select), not free text.

## Passport OCR
When user uploads passport image in account.tsx profile, OCR auto-fills: passportNumber, nationality, dateOfBirth, passportIssueDate, passportExpiryDate, passportIssueCountry, gender, firstName/lastName (if empty).

**Why:** Single source of truth — profile data feeds into visa applications; OCR prevents mis-entry.
