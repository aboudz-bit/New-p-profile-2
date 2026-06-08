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

# P Profile — Module Map

> Companion to `PRODUCT_VISION.md`. Maps each module of the **Product Identity
> Platform** to its **current code state**. Analysis only — nothing built here.
>
> State legend: **Implemented** (end-to-end code exists) · **Partial** (some
> layers, key pieces missing) · **Placeholder** (schema/scaffold only) ·
> **Missing** (not in code). All "Implemented" remain **unverified at runtime**
> (project not yet compiled/run — see `PROJECT_STATE.md`).

---

## 0. Profile Core (shared by all actors)

The **product profile** is the central record every module reads/writes.

| Capability | State | Notes |
|---|---|---|
| Product identity (name, category, brand, model, serial) | **Implemented** | `assets` table; serial unique per tenant |
| Purchase invoice link | **Partial** | `assets.invoiceId` FK + `invoices` table exist; **no invoice CRUD/UI** |
| Warranty (manufacturer/extended/protection) | **Implemented** | `warranties`, derived status |
| Maintenance + repair history | **Implemented** | `maintenance_records` |
| Authorized service centers (linked) | **Implemented** | `asset_service_centers` M:N |
| Manufacturer info | **Implemented** | `manufacturers` (per tenant) |
| Documents / attachments | **Implemented** | `documents` (local-disk storage) |
| Product status | **Implemented** | `asset_status` enum |
| **Ownership history** | **Missing** | no ownership/transfer table |
| **Reminders** | **Missing** | no scheduling/notification engine |

---

## 5. B2C (Consumer) Modules

A consumer = `companies.type = 'individual'` (one auto branch). The plumbing
exists; the **consumer experience and consumer-specific flows do not**.

| Module | State | Gap to vision |
|---|---|---|
| Store products (personal vault) | **Partial** | Works as tenant data; no consumer onboarding/UX, no individual-mode entry path |
| Track warranties | **Implemented** | Reuses warranty module + derived status |
| Receive reminders | **Missing** | No reminder/notification engine, no scheduler, no email/push |
| Find authorized service centers | **Partial** | Per-tenant list only; **no public/shared directory, no geo/brand search** |
| Request maintenance | **Missing** | Maintenance *records* exist, but no consumer "request → provider" workflow |
| Renew warranty | **Missing** | No renewal flow or offers |
| Transfer ownership | **Missing** | No ownership model or transfer action |

---

## 6. B2B (Company) Modules

This is the **most built** lens today.

| Module | State | Gap to vision |
|---|---|---|
| Asset Registry | **Implemented** | List/search/filter/create/detail |
| Branch management | **Implemented** | CRUD (no edit UI); primary-branch guard |
| Employee responsibility tracking | **Partial** | `assets.responsibleUserId` exists; no assignment workflow/reassignment UI or per-employee view |
| Maintenance management | **Implemented** (basic) | Create/list + asset-status sync; no edit/status-change UI, no scheduling |
| Warranty dashboard | **Implemented** | Totals + expiring/expired counts |
| Reporting | **Implemented** | CSV (assets/warranties/maintenance) |
| Multi-branch operations | **Partial** | Branches exist, but **`manager` role is company-wide, not branch-scoped**; no cross-branch transfer |

---

## 7. Service Provider Modules

Today service centers exist only as **tenant reference data** — there is **no
provider as an actor** (no provider login, no inbound jobs).

| Module | State | Gap to vision |
|---|---|---|
| Authorized service centers | **Implemented** (as data) / **Missing** (as actor) | `service_centers` + supported-brands M:N; no provider portal/login |
| Maintenance companies | **Missing** | No provider org/account type |
| Warranty providers | **Missing** | `warranties.provider` is free text; no provider entity/account |
| Inbound job queue / accept-decline | **Missing** | No request routing or job lifecycle |
| Provider profile, ratings, SLA | **Missing** | — |

---

## 8. Manufacturer Modules

Manufacturers exist only as **per-tenant reference rows**; there is **no
manufacturer portal or cross-tenant manufacturer identity**.

| Module | State | Gap to vision |
|---|---|---|
| Product registration (by manufacturer) | **Missing** | No manufacturer-initiated profile creation |
| Warranty verification | **Missing** | No verification endpoint/portal |
| Service-center network management | **Partial** | `service_center_manufacturers` M:N exists as tenant data; no manufacturer-owned network or portal |
| Recalls / updates push to profiles | **Missing** | — |
| Manufacturer analytics | **Missing** | — |

---

## Cross-cutting modules (apply to all actors)

| Module | State |
|---|---|
| Authentication (email/password) | **Implemented** (no OTP/SMS by design) |
| RBAC / permissions | **Implemented** (company-scoped roles; needs partner/consumer roles + branch scope) |
| Multi-tenant isolation | **Implemented** |
| Arabic RTL + English | **Implemented** |
| Mobile + desktop responsive | **Implemented** |
| Document storage | **Implemented** (local disk; adapter swappable) |
| Activity log / audit | **Implemented** |
| **Shared directories** (public service centers / manufacturers) | **Missing** |
| **Notifications / reminders** | **Missing** |
| **Billing / subscriptions** | **Placeholder** (`companies.plan`) |
| **OCR intake** | **Missing** (architecture-ready) |

---

## Summary: biggest gaps between vision and code

1. **Actor model is incomplete** — only "company user" exists. Consumer,
   service-provider, and manufacturer **accounts/portals are not modeled**.
2. **Profile is not yet cross-actor** — it lives inside one tenant; the vision
   needs a profile that providers/manufacturers can also see (shared identity +
   permissioned access).
3. **Missing lifecycle pieces:** ownership/transfer history, reminders, warranty
   renewal, maintenance *requests*, shared directories.
4. **Naming/UX still B2B-asset-centric** — "Asset" should be presented as
   "Product profile" in consumer contexts (data model already supports it).

These are analysis findings to inform the roadmap — **no changes were made.**
