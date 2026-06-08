# P Profile — Build Report (Audit & Hardening Pass)

> Autonomous audit/hardening session over the Phase 1 codebase. **No commits, no
> pushes.** Constraints honored: no new major features, no marketplace/OCR/
> insurance/portals/payments/SMS/OTP, product vision unchanged, Access-v1 untouched.

## Summary
Audited architecture, routes, RBAC, lifecycle, and both lenses against
[`PRODUCT_PROFILE_DESIGN.md`](./PRODUCT_PROFILE_DESIGN.md); ran the app against real
PostgreSQL and validated all flows in a browser; fixed a production-blocking bug and
several safe issues; produced full documentation. Code **typechecks and builds
clean**; runtime + browser validation **pass**.

---

## Gap-closure pass (4 Phase 1 gaps)
A follow-up pass closed the four targeted design-Phase-1 gaps. No new vision, no
portals/marketplace/OCR/payments. Typecheck + build clean; validated API + browser.

**New files:** `server/lib/statusHistory.ts`, `server/routes/models.routes.ts`,
`server/routes/claimRequests.routes.ts`, `client/src/lib/models.ts`.

**Schema:** added `status_history` and `claim_requests` tables + `claim_status`
enum; **renamed** the `productProfiles` → `productModel` relation (see bug below).
Applied with `drizzle-kit push --force`.

**Modified:** `shared/schema.ts`; `server/routes/profiles.routes.ts` (model link,
status-history on create/edit, detail returns `statusHistory` + incoming
`claimRequests`, rewritten claim: unowned→direct / owned→pending+proof);
`server/routes/maintenance.routes.ts` (status-history on auto-flips);
`server/routes/users.routes.ts` (`GET /users/assignable`);
`server/routes/index.ts` (mount `models`, `claim-requests`);
`client/src/pages/ProductRegistry.tsx` (model select/create, responsible-user
select, claim proof note+file + pending result);
`client/src/pages/ProductProfile.tsx` (model row, **History** tab, claim-requests
banner with reject, model + responsible selectors in Edit);
`client/src/lib/translations.ts` (model/history/claim keys, AR+EN).

**Gap coverage:**
1. **Product Model catalog** — `GET/POST /api/models`; Create/Edit selects an
   existing model or creates one; `productModelId` linked; free-text fallback kept.
2. **Responsible User UI** — business-lens selector (fed by `/users/assignable`,
   so managers without `user:manage` can assign); shown in detail; hidden for consumers.
3. **Status History** — recorded on create (`∅→active`), status edit (with reason),
   and service open/complete flips; surfaced in the History tab.
4. **Claim Requests** — unowned → direct claim; owned → pending request with proof
   note + optional file; owner reject / requester cancel; approval/transfer = Phase 2.

**Bug found & fixed (this pass):** the Drizzle relation `model` collided with the
free-text `model` column, shadowing it in `findFirst({ with: { model } })` detail
responses. Renamed the relation to `productModel` (schema + detail query + client).
Verified the free-text model and catalog model now both render.

**Validation:** `npm run check` clean; `npm run build` clean; `drizzle-kit push`
applied; API tests for all 4 gaps incl. **unowned direct-claim** (via an inserted
owner-less profile) and owned→pending→reject; browser DOM verification of model
row, responsible user, History timeline, Edit selectors (model pre-selected), and
the claim-requests banner. (Screenshot capture was flaky this session; DOM-level
assertions via preview_eval were used instead.)

**Still open (tracked in TECHNICAL_DEBT.md):** edit UIs for
warranty/maintenance/branch/user/directory; user delete/suspend; org settings;
`share_grants`; `manager` branch-scoping; migrations/tests/CI/auth-hardening.

---

## Files created (12) — initial audit pass
- `docs/API_REFERENCE.md`, `docs/DATABASE_SCHEMA.md`, `docs/RBAC_MATRIX.md`,
  `docs/USER_FLOWS.md`, `docs/DEPLOYMENT_GUIDE.md`, `docs/KNOWN_LIMITATIONS.md`
- `docs/PHASE1_AUDIT.md`, `docs/PHASE1_GAP_ANALYSIS.md`,
  `docs/PRODUCTION_READINESS.md`, `docs/TECHNICAL_DEBT.md`, `docs/BUILD_REPORT.md`
- (local, gitignored) `.env` for runtime validation

## Files modified
- **Bug fix:** `server/lib/vite.ts` (production client path).
- **Hardening:** `server/index.ts` (security headers), `server/routes/maintenance.routes.ts` (status-flip guard).
- **Alignment:** `server/routes/profiles.routes.ts` (warranty timeline order).
- **UX:** `client/src/pages/ProductProfile.tsx` (Edit Product Profile modal; shareable label),
  `client/src/lib/translations.ts` (`warranty.shareable` AR/EN).
- **Cleanup:** `shared/schema.ts` (removed unused insert-schema exports);
  `README.md`, `ARCHITECTURE.md` (superseded banners → design doc);
  `docs/README.md` (indexed new docs); `.claude/launch.json` (added `preview (prod build)` config);
  `docs/PRODUCTION_READINESS.md` (verdict emoji encoding fix).

## Dependencies added
- **None this session.** (Prior phase added `qrcode.react`.) Security headers were
  implemented dependency-free.

## Bugs found
1. 🔴 **Production SPA 500** — `vite.ts` resolved the built client one directory too
   high (`../../public` → `<root>/public`), so every non-API route returned
   `{"error":"Internal server error"}` in production (`npm run start`). Dev was
   unaffected (Vite middleware). **Found via browser validation.**
2. 🟠 **Maintenance status flip** could resurrect a `retired`/`disposed` product to
   `in_service` when a service record was added.
3. 🟡 **Confusing warranty "shareable" label** (composed from unrelated strings).
4. 🟡 **Missing "Edit Product Profile" UI** (backend PATCH existed, unused).

## Bugs fixed
All four above. Re-validated in the browser (production build): `/register` and all
SPA routes serve correctly; edit-profile round-trips (verified via API read-back);
status-flip guard and timeline order confirmed by code + typecheck. No console errors.

## Validation performed
- `npm run check` (tsc) — clean; `npm run build` — clean.
- Real PostgreSQL (`db:push` + `seed`); production server boot.
- Browser: register (RTL), login, dashboard (AR mobile + EN desktop), registry,
  profile detail + QR, **edit profile**, public preview (privacy leak-checked),
  language/RTL↔LTR toggle, mobile + desktop viewports.
- API-level (prior turn): register/login/create/detail/public/warranty/maintenance/
  document/dashboard — all pass.

## Risks
- **Schema via `push`, no migrations** — risky once real data exists (🔴 before prod data).
- **No tests/CI** — regressions can slip in (🔴).
- **Auth**: non-revocable sessions, no rate limiting (🟠).
- **Documents** served unauthenticated from `/uploads` (🟠; unguessable keys mitigate).
- **No pagination**, local-disk storage, no observability (🟠 at scale).
Full list: [`TECHNICAL_DEBT.md`](./TECHNICAL_DEBT.md), [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md).

## Remaining work (Phase 1 closure — product decisions, not assumptions)
From [`PHASE1_GAP_ANALYSIS.md`](./PHASE1_GAP_ANALYSIS.md):
1. **Wire the Product Model catalog** (table exists but unused) — or formally defer to Phase 2.
2. **Expose Responsible User** in Add/Edit profile (business lens; API ready).
3. **`status_history`** module — implement or document the `activity_logs` substitution.
4. **Claim hardening** — proof + dedupe, or document the trust-based Phase 1 claim.
5. **Edit UIs** for warranty/maintenance/branch/user/directory.
> Items 1, 3, 4 are scope decisions — flagged for confirmation, not built.

## Recommended next milestone
**M6 — "Phase 1 closure + production hardening":**
- Wire Product Model catalog + Responsible User selector (close core gaps).
- Versioned migrations; test suite + CI; auth hardening (session revocation + login
  rate limit); authenticated document download; pagination.
This converts the foundation from **pilot-ready** to **GA-ready** without touching
Phase 2 features.

## Production readiness
**Amber — pilot/demo-ready, not GA-ready.** Functionally complete for the Phase 1
core and validated end-to-end; GA needs the migration + tests + auth-hardening
gates in [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md). No commits or pushes
were made; the working tree is unchanged from a VCS perspective (still untracked).
