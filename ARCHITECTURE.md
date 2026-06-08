> ## ⚠️ SUPERSEDED DOCUMENT
>
> This document is retained for historical context only and describes the earlier
> asset-framed, single-tenant (`companyId`) architecture.
>
> The current architectural source of truth is:
>
> **[`docs/PRODUCT_PROFILE_DESIGN.md`](docs/PRODUCT_PROFILE_DESIGN.md)**
>
> The implemented Phase 1 model is profile-centric (`parties` + `product_profiles`
> + `profile_associations`), not `companies`/`assets`. If anything below conflicts
> with `PRODUCT_PROFILE_DESIGN.md`, that document takes precedence.

---

# P Profile — Architecture

## 1. Principles

1. **Multi-tenant from day one.** Every business-owned row has `companyId`. The
   API derives `companyId` from the authenticated user and scopes **every**
   query by it (`server/lib/auth.ts` → `req.companyId`). There is no code path
   that reads tenant data without this filter.
2. **B2B-first, B2C-ready.** A tenant is a `companies` row with `type` =
   `business | individual`. A future consumer is simply an `individual` company
   with one auto branch — no schema change required.
3. **Contract in `shared/`.** The DB schema, Zod validators, RBAC matrix, and
   warranty math live in `shared/` and are imported by both client and server,
   so types and rules cannot drift.
4. **Derived data is computed, never stored.** Warranty status / remaining days
   are computed from `endDate` at read time (`shared/warranty.ts`).

## 2. Tenancy & RBAC

```
Company ──< Branch ──< User(role)
   │
   └──< Asset, Manufacturer, ServiceCenter, Invoice, ActivityLog ...
```

Roles (enum on `users.role`): `owner > admin > manager > technician > viewer`.
Permissions are defined once in `shared/permissions.ts` and enforced server-side
by `requirePermission()`. The client uses the same matrix only to hide controls.

> Upgrade path: to let one user belong to multiple companies, introduce a
> `memberships(user, company, role)` table and move `role` there. Nothing else
> in the model needs to change — `companyId` already scopes every row.

## 3. Data model

| Table | Purpose | Key links |
|------|---------|-----------|
| `companies` | tenant root (`type`, `plan`, `defaultCurrency`) | — |
| `branches` | physical/org units | → company |
| `users` | accounts + role + default branch | → company, branch |
| `manufacturers` | brands | → company |
| `service_centers` | authorized centers | → company |
| `service_center_manufacturers` | "supported brands" (M:N) | center ↔ manufacturer |
| `invoices` | purchase documents (1 invoice → many assets) | → company, branch |
| `assets` | the lifecycle subject | → branch, responsibleUser, manufacturer, invoice |
| `asset_service_centers` | asset ↔ center (M:N) | asset ↔ center |
| `warranties` | manufacturer / extended / protection_plan | → asset |
| `maintenance_records` | open / in_progress / completed | → asset, serviceCenter |
| `documents` | invoice / warranty_cert / service_report / other | → asset, maintenanceRecord |
| `activity_logs` | audit trail + dashboard recent activity | → actor user |

All PKs are UUID (`gen_random_uuid()`); all `companyId` and FK columns are
indexed; `serial_number` is unique per tenant.

## 4. Lifecycle state

- **Asset.status**: `active ⇄ in_maintenance → retired → disposed`. Opening a
  non-completed maintenance record flips the asset to `in_maintenance`;
  completing it returns the asset to `active`.
- **Warranty.status** (derived): `active` → `expiring_soon` (≤30 days) →
  `expired`.
- **Maintenance.status**: `open → in_progress → completed`.

## 5. API surface (`/api`)

`auth` (register/login/logout/me) · `branches` · `users` · `manufacturers` ·
`service-centers` · `assets` (+ `/:id/service-centers`) · `warranties` ·
`maintenance` · `documents` · `dashboard/stats` · `reports/{assets,warranties,maintenance}.csv`.

All except `auth/*` require authentication; writes require the matching
permission. Validation uses the shared Zod insert schemas.

## 6. Storage

Document binaries go through a `StorageAdapter` (`server/lib/storage.ts`).
The local-disk adapter writes under `UPLOAD_DIR` and stores an opaque
`storageKey` on the row — swap in S3/GCS later with **no schema change**.

## 7. Future-ready extension map (NOT built yet)

The model already carries the seams for each future capability:

| Future feature | How it attaches with no redesign |
|---|---|
| **OCR invoice scanning** | `invoices` + `documents` exist; add an OCR service that creates an invoice + assets from an uploaded document. The B2C prototype's Google-Vision parser can be ported as a service. |
| **Warranty renewal marketplace** | `warranties` has provider + dates; add a `renewal_offers` table referencing `warrantyId`. Derived `expiring_soon` already surfaces candidates. |
| **Insurance providers** | `warranties.type` already includes `protection_plan`; add a `providers` table and FK from warranty. |
| **Manufacturer / service-provider portals** | `manufacturers` & `service_centers` are first-class; add portal users via a role + a `companyId`-less membership, or a separate `partner_users` table. |
| **Asset transfer** | add `asset_transfers(assetId, fromCompany/Branch, toCompany/Branch, at)`; `assets` already key everything by id. |
| **QR asset tracking** | add `assets.qr_code` / a `tags` table; the asset detail route is ready to render it. |
| **Individual mode (B2C)** | register a `companies` row with `type='individual'`; all flows already work per-tenant. |
| **Subscription / billing** | `companies.plan` placeholder exists; add `subscriptions` keyed by `companyId`. |
| **Reports → PDF/XLSX/scheduled** | reports are builders returning columns+rows; add new renderers next to `toCsv`. |

## 8. Security notes (foundation)

- Passwords: scrypt + per-user salt, constant-time verify.
- Session: stateless HMAC-signed httpOnly cookie (7-day TTL); `SESSION_SECRET`
  required & validated in production.
- Tenant isolation enforced in every query via `companyId`.
- Request bodies validated with Zod before touching the DB.

### Known follow-ups (intentionally out of scope for the foundation)
Rate limiting on login, refresh/rotation of session tokens, soft-delete &
audit on destructive ops, versioned migrations (currently `drizzle-kit push`),
and per-branch scoping for the `manager` role (today managers see the whole
company).
