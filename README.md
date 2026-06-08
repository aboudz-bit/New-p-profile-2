> ## ⚠️ SUPERSEDED DOCUMENT
>
> This document is retained for historical context only and describes the earlier
> asset-framed foundation.
>
> The current architectural source of truth is:
>
> **[`docs/PRODUCT_PROFILE_DESIGN.md`](docs/PRODUCT_PROFILE_DESIGN.md)**
>
> P Profile is a **Product Identity Platform** — the **Product Profile** is the
> central object, not an "asset." If anything below conflicts with
> `PRODUCT_PROFILE_DESIGN.md`, that document takes precedence. See also
> [`docs/README.md`](docs/README.md) for the documentation index.

---

# P Profile — B2B Asset, Warranty & Maintenance Platform

A multi-tenant SaaS **foundation** for managing the full lifecycle of an asset:

> **Purchase → Warranty → Service Center → Maintenance → Renewal → Retirement**

B2B-first, Arabic-first (RTL), mobile + desktop responsive. Built so that B2C
(individual) mode and future integrations can be added **without redesign**.

## Stack

| Layer | Tech |
|------|------|
| Frontend | React 19, Vite, Tailwind v4, wouter, TanStack Query |
| Backend | Express 5 (TypeScript, ESM), cookie auth (scrypt + HMAC) |
| Database | PostgreSQL + Drizzle ORM (snake_case, UUID PKs) |
| Shared | `shared/schema.ts` (DB + Zod), `shared/permissions.ts` (RBAC), `shared/warranty.ts` (derived status) |

No SMS, no OTP, no third-party APIs. Email + password auth only.

## Getting started

```bash
# 1. install
npm install

# 2. configure
cp .env.example .env          # set DATABASE_URL + SESSION_SECRET

# 3. create the schema (Postgres must be running)
npm run db:push

# 4. (optional) seed a demo tenant
npm run seed                  # login: owner@demo.pprofile / Owner12345

# 5. run (API + client on one origin)
npm run dev                   # http://localhost:5000
```

Type-check only (no DB needed): `npm run check`.

## Project layout

```
shared/      schema.ts · permissions.ts · warranty.ts   (single source of truth)
server/      index.ts · db.ts · lib/* · routes/*         (Express API)
client/      src/pages · src/components · src/lib         (React SPA)
```

## Core model

`Company → Branch → User(role)` is the tenancy + RBAC backbone. Every business
row carries `companyId`; queries are always tenant-scoped. Assets link to
Manufacturer, Invoice, Branch and a responsible User, and own Warranties,
Maintenance records, Documents and Service-Center links.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full data model, RBAC matrix,
and the future-ready extension map.
