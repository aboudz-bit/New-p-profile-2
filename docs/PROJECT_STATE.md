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

# P Profile — Project State

> **Audit type:** Read-only architecture review of the `p-profile-business` codebase.
> **Audit date:** 2026-06-07
> **Scope:** Source code only. Nothing has been installed, compiled, run, or
> connected to a database yet.
> **Status:** **Source-complete foundation, UNVERIFIED at runtime.** All 62 files
> were authored this session; `npm install`, `tsc`, `db:push`, and the dev server
> have **not** been executed, so there is no proof the code compiles or runs.

---

## 1. What this is

A B2B-first, multi-tenant **Asset, Warranty & Maintenance** SaaS foundation.
React 19 SPA + Express 5 API + PostgreSQL (Drizzle ORM), Arabic-first/RTL,
mobile + desktop responsive. Auth is email/password only (no OTP/SMS by design).

The intended lifecycle the model supports:
**Purchase → Warranty → Service Center → Maintenance → Renewal → Retirement.**

## 2. Codebase at a glance

| Area | Files | Notes |
|------|-------|-------|
| `shared/` | `schema.ts`, `permissions.ts`, `warranty.ts` | DB schema (11 tables), RBAC matrix, derived warranty math |
| `server/` | `index.ts`, `db.ts`, 8 `lib/*`, 11 route files | Express API, 11 mounted routers |
| `client/` | 13 pages, 6 components, 7 libs | SPA, AR/EN i18n, responsive shell |
| `docs/` | this review | — |
| config | `package.json`, `tsconfig.json`, `vite.config.ts`, `drizzle.config.ts`, `.env.example` | |

## 3. Mounted API routers (verified)

`auth · branches · users · manufacturers · service-centers · assets · warranties ·
maintenance · documents · dashboard · reports` — **11 routers.**

Notable absences confirmed in code:
- **No `invoices` router** — the `invoices` table exists in the schema but has no
  endpoints or UI.
- **No company-management router** — a company is created only at registration;
  it cannot be renamed/managed via the API.
- **`users` has no DELETE**, and **`warranties` has no GET** (warranties are read
  through the asset-detail relational query).

## 4. Honest runtime caveat

Because nothing has been built or executed:
- The TypeScript may contain compile errors not yet caught.
- Drizzle relational queries (`db.query.assets.findFirst` with `with:`) and the
  raw `CURRENT_DATE` SQL in the dashboard are **unproven** against a live PG.
- Tailwind v4 token wiring (`@theme inline`) is **unproven** in a real build.
- No data has ever round-tripped through the API.

Treat every "Implemented" below as **"code exists and is internally consistent,"
not "tested in production."**

See `FEATURE_MATRIX.md` for the per-feature breakdown, `ARCHITECTURE.md` for the
data model and flows, and `NEXT_STEPS.md` for the prioritized gaps.
