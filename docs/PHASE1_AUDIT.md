# P Profile — Phase 1 Audit

> Scope: architecture, routes, entities, relationships, RBAC, lifecycle, B2B/B2C
> lenses, plus security and database reviews. Method: code review + runtime
> validation (production build, real PostgreSQL, browser-driven). Reference:
> [`PRODUCT_PROFILE_DESIGN.md`](./PRODUCT_PROFILE_DESIGN.md).

## 1. Verdict
The implementation **aligns with the design**. The Product Profile is the central
object (`product_profiles`), ownership lives in `profile_associations`, the B2B
lens is isolated in `business_profile_context`, and directories/warranty providers
are Phase-1 data-only. One **production bug** was found and fixed; several safe
improvements were applied. No design conflicts remain.

## 2. Architecture review (vs design)

| Area | Finding | Status |
|---|---|---|
| Central object | `product_profiles` with permanent `pProfileId`; no `companyId`/owner column | ✅ aligned |
| Identity | `pProfileId` minted always; serial secondary (nullable, non-unique index) | ✅ aligned |
| Associations | owner/servicer/… with `validFrom/To`; ownership history derivable | ✅ aligned |
| B2B lens | branch/responsibleUser/internalReference on `business_profile_context` (1:1 with owner association), not on the global profile | ✅ aligned |
| Modules carry provenance | `partyId` + `visibility` on warranties/maintenance/purchase/documents | ✅ aligned |
| Purchase price privacy | in `purchase_records` (owner-private), excluded from public preview (verified) | ✅ aligned |
| Directories | per-party; service-center `authorizationSource` limited to Phase 1 sources | ✅ aligned |
| Warranty types + chain | manufacturer/extended/protection_plan + `supersedesId`; derived status | ✅ aligned |
| Public QR preview | unauthenticated, safe fields only; leak-checked | ✅ aligned |
| Lifecycle status flip | open service → `in_service`; complete → `active` | ✅ (hardened — see fixes) |

## 3. Routes audit
11 routers mounted ([`server/routes/index.ts`](../server/routes/index.ts)):
`public` (unauth), `auth`, `branches`, `users`, `directory`, `profiles`,
`warranties`, `maintenance`, `documents`, `dashboard` (+ `/health`). All
tenant-scoped reads/writes filter by `req.partyId`; profile mutations gate on an
active owner association; writes gate on the RBAC permission. `/api/<unknown>`
returns JSON `404` (verified). Full surface: [`API_REFERENCE.md`](./API_REFERENCE.md).

## 4. RBAC audit
Single matrix in [`shared/permissions.ts`](../shared/permissions.ts), enforced by
`requirePermission()`, mirrored client-side for UX. All 5 roles hold
`profile:read`/`maintenance:read`, so unguarded reads are still safe (and
party-scoped). Owner-only guard on creating/promoting owners is present. Matrix:
[`RBAC_MATRIX.md`](./RBAC_MATRIX.md).

## 5. Security review
| # | Finding | Severity | Action |
|---|---|---|---|
| S1 | Documents served unauthenticated from `/uploads` (unguessable two-UUID keys, but no auth check) | Medium | Documented; recommend authenticated download route (Phase 2) |
| S2 | Stateless sessions, non-revocable until 7-day TTL | Medium | Documented; recommend token-version/store |
| S3 | No login rate limiting / lockout | Medium | Documented (Phase 2) |
| S4 | No CSP/HSTS | Low | Basic headers **added** (nosniff, frame-options, referrer-policy, dns-prefetch-off) |
| S5 | Upload accepts any MIME, no scanning | Low | Documented; size-capped (25 MB) |
| S6 | Deleting a document orphans the disk file | Low | Documented |
| ✓ | Passwords scrypt+salt, constant-time verify; httpOnly+`secure`(prod)+`sameSite=lax` cookie; Zod validation on all writes; tenant scoping on every query; public preview leak-checked | — | Verified good |

## 6. Database review
- **Indexes:** every `partyId`/FK and the hot filters (`(partyId,status)`,
  `(partyId,endDate)`, `(profileId)`) are indexed; `pProfileId` unique. Good.
- **Constraints:** FKs with deliberate `cascade` (ownership/modules) vs `set null`
  (references) — verified correct cascade behavior.
- **Unique keys:** `pProfileId` unique; `(partyId,email)` unique; M:N links unique.
- **Recommendations (see [`TECHNICAL_DEBT.md`](./TECHNICAL_DEBT.md)):**
  partial-unique on `(manufacturerKey, serialNumber)` where both present (hard
  dedup); partial-unique enforcing one active `owner` association per profile;
  consider `CHECK`/enum for `directory.authorizationSource` business rules; adopt
  versioned migrations before real data.

## 7. Fixes applied during this audit
1. **[BUG] Production SPA serving** — `server/lib/vite.ts` resolved the client dir
   one level too high (`../../public` → `<root>/public`); all non-API routes 500'd
   in production. Fixed to `../public` (`dist/public`). Verified `/register` etc.
   now serve the SPA. (Dev mode was unaffected — uses Vite middleware.)
2. **[HARDENING] Maintenance status flip** — opening a service record no longer
   resurrects a `retired`/`disposed` product (only `active` → `in_service`).
3. **[ALIGN] Warranty timeline order** — profile detail orders coverage
   manufacturer → extended → protection plan, then by start date (uses
   `WARRANTY_TYPE_ORDER`).
4. **[SECURITY] Headers** — added conservative, dependency-free security headers.
5. **[UX] Warranty "shareable" label** — replaced a confusing composed label with a
   proper `warranty.shareable` i18n string (AR/EN).
6. **[UX] Edit Product Profile** — added the missing edit modal (backend PATCH
   already existed); supports retire/dispose via status. Verified in browser.
7. **[QUALITY] Dead code** — removed unused insert-schema exports; root `README.md`
   and `ARCHITECTURE.md` now carry the superseded banner pointing to the design doc.

## 8. Runtime validation summary
Register (business + personal), login/logout, create/edit profile, profile detail
+ QR, public preview (leak-checked), add warranty/maintenance/document, link
service center, dashboard, branches, users, settings, AR-RTL + EN-LTR, mobile +
desktop — all pass. No console errors. Details: [`USER_FLOWS.md`](./USER_FLOWS.md),
[`BUILD_REPORT.md`](./BUILD_REPORT.md).
