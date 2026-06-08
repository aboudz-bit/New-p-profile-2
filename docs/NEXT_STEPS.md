> ## ⚠️ SUPERSEDED DOCUMENT
>
> This document is retained for historical context only.
>
> The current architectural source of truth is:
>
> **`docs/PRODUCT_PROFILE_DESIGN.md`**
>
> If any conflict exists between this document and `PRODUCT_PROFILE_DESIGN.md`, the `PRODUCT_PROFILE_DESIGN.md` document takes precedence.

---

# P Profile — Next Steps (D · E · F)

> Read-only assessment. No work performed.

---

## D. What is production-ready

**Production-*grade in design*, but NOTHING is production-*proven* yet** — the
project has not been installed, compiled, run, or connected to a database. With
that caveat, the parts that are written to a production standard and are the
strongest candidates once verified:

1. **Data model & multi-tenant isolation** — clean schema, UUID PKs, indexed
   `companyId` + FKs, per-tenant unique serials, every query scoped by tenant.
2. **RBAC** — single shared permission matrix, enforced server-side on every
   write, mirrored on the client for UX only.
3. **Auth primitives** — scrypt+salt, constant-time verify, HMAC httpOnly cookie,
   `SESSION_SECRET` validated in production.
4. **Contract sharing** — `shared/` schema + Zod + permission + warranty math
   imported by both sides, so types/rules can't drift.
5. **Derived warranty logic** — computed, never stored (cannot go stale).
6. **AR/EN + RTL** and **responsive shell** — complete and coherent.
7. **CSV export** — UTF-8 BOM for Arabic/Excel correctness.

**Mandatory before calling any of this production-ready:** `npm install` →
`tsc` (typecheck) → `db:push` against real PG → run dev server → manual
smoke-test of each flow → add automated tests.

## E. What is demo-only / not yet production

1. **Unverified build** — no install, no compile, no run; correctness unproven.
2. **No tests, no CI** anywhere.
3. **Schema via `drizzle-kit push`** — no versioned migrations (unsafe for prod data).
4. **Seed demo tenant** (`owner@demo.pprofile / Owner12345`) — must never ship enabled.
5. **Local-disk document storage** — single-node only; not durable/scalable (adapter is swappable).
6. **Login hardening absent** — no rate limiting, lockout, or token revocation.
7. **`cors`/security headers** — not configured; no Helmet, no CSRF beyond SameSite.
8. **Invoices** — table only; not a usable feature.
9. **`manager` role** is company-wide, not branch-scoped (over-permissive).
10. **Dashboard `CURRENT_DATE` SQL & relational queries** — unproven against live PG.
11. **No observability** — no metrics/error tracking; only console logging.
12. **No pagination** — list endpoints return all rows (fine for demo, not scale).

## F. Top 20 missing features

Ordered roughly by foundational value:

1. **Verified build + typecheck + run** (install, `tsc`, `db:push`, smoke test).
2. **Automated tests + CI** (unit for warranty math/permissions; API integration).
3. **Versioned DB migrations** (replace push-only).
4. **Invoice management** — CRUD + UI; link assets to invoices (1 invoice → many assets).
5. **Asset edit / retire / dispose** actions in the UI (server PATCH exists).
6. **Maintenance edit + status transitions** in the UI (server PATCH exists).
7. **User management completeness** — edit role/status, suspend, delete (UI + DELETE endpoint).
8. **Company settings** — rename, default currency, plan; company-admin endpoints.
9. **Branch-scoped permissions** for `manager` (today company-wide).
10. **Warranty expiry notifications/alerts** (the data is ready; no engine).
11. **Login security** — rate limiting, lockout, token rotation/revocation, password reset.
12. **Pagination + server-side sorting** on all list endpoints.
13. **List filtering everywhere** (branch/category/date ranges; warranty status filter).
14. **Document storage adapter for S3/GCS** + signed URLs + larger-file handling.
15. **OCR invoice scanning** (future-ready): document → invoice + assets extraction.
16. **Warranty renewal workflow / marketplace** (future-ready hooks exist).
17. **Asset transfer** between branches/companies (+ history).
18. **QR asset tracking** (code generation + scan lookup).
19. **Richer reports** — PDF/XLSX, filtered, scheduled; report run history.
20. **Individual (B2C) mode** activation (`companies.type='individual'` path) and
    **subscription/billing** (`companies.plan` placeholder exists).

---

### Suggested immediate sequence (when you authorize building)
`npm install` → `npm run check` (fix any type errors) → provision PostgreSQL →
`npm run db:push` → `npm run seed` → `npm run dev` → smoke-test the 9 flows in
ARCHITECTURE.md §C. Only after that does "production-ready" become a meaningful claim.
