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

# P Profile — Architecture Review (A · B · C)

> Read-only. Describes what the code currently is. A deeper engineering version
> lives at the repo-root `ARCHITECTURE.md`; this file is the review deliverable.

---

## A. Current Product Vision

**P Profile is a multi-tenant B2B platform for tracking the lifecycle of physical
assets and their warranties and maintenance.** A company registers, gets a primary
branch and an owner account, then records its assets — each asset carrying its
manufacturer, purchase details, warranties (manufacturer / extended / protection
plan), maintenance history, linked authorized service centers, and documents.
A dashboard surfaces totals and expiring/expired warranties; CSV reports export
the data.

It is **Arabic-first** (RTL default, English toggle) and **responsive** for
mobile and desktop. The data model is deliberately built so that **B2C
(individual) mode and future integrations (OCR, renewal marketplace, insurance,
portals, QR, asset transfer, billing) can be added without redesign** — but none
of those are built yet. As of now it is a **source-complete foundation that has
not been compiled or run.**

---

## B. Current Data Model

11 tables (all UUID PKs, `snake_case`, `companyId`-scoped where business-owned).

```
companies (tenant root: type business|individual, plan, defaultCurrency)
  │
  ├─< branches (isPrimary)
  │     └─< users (role, status, branchId)        role ∈ owner|admin|manager|technician|viewer
  │
  ├─< manufacturers ──┐
  │                   ├─< service_center_manufacturers >─┐   (supported brands, M:N)
  ├─< service_centers ┘                                  │
  │     │                                                │
  │     └──────────────< asset_service_centers >─────────┤   (asset ↔ center, M:N)
  │                                                       │
  ├─< invoices (merchant, total, currency)   [TABLE ONLY — no API/UI]
  │
  └─< assets ───────────────────────────────────────────┘
        │  (branchId, responsibleUserId, manufacturerId, invoiceId,
        │   name, category, brand, model, serialNumber[unique/tenant],
        │   purchaseDate, purchasePrice, currency, status)
        ├─< warranties (type, provider, startDate, endDate; status DERIVED)
        ├─< maintenance_records (type, status, cost, serviceCenterId, providerName)
        │     └─< documents (maintenanceRecordId)
        └─< documents (assetId; type invoice|warranty_certificate|service_report|other)

activity_logs (actorUserId, entityType, entityId, action, summary, metadata) — audit + dashboard feed
```

**Enums:** `company_type`, `user_role`, `user_status`, `asset_status`
(active|in_maintenance|retired|disposed), `warranty_type`
(manufacturer|extended|protection_plan), `maintenance_status`
(open|in_progress|completed), `maintenance_type`, `document_type`.

**Derived, never stored:** warranty `status` (active / expiring_soon ≤30d /
expired) and `remainingDays`, computed at read time in `shared/warranty.ts`.

**Tenant isolation:** every business table has `companyId`; every server query
filters by `req.companyId` (set from the session in `requireAuth`).

---

## C. Current User Flows

Flows that exist end-to-end in the code (UI → API → DB):

1. **Onboarding** — Register (company name, name, email, password) → server
   transaction creates `company` + primary `branch` + `owner` user → session
   cookie set → redirect to dashboard.
2. **Login / logout** — email+password → cookie; `/auth/me` rehydrates session;
   logout clears cookie and query cache.
3. **Dashboard** — totals (assets, under-maintenance), expiring/expired warranty
   counts, recent activity feed.
4. **Asset registry** — list with search + status/branch filters → open asset →
   create asset (modal with branch & manufacturer selects).
5. **Asset profile (detail)** — tabs: Overview · Warranties (add/list/delete with
   derived status) · Maintenance (add/list, auto-sets asset status) · Documents
   (upload via base64 → local disk, list/delete) · Service Centers (link/unlink).
6. **Reference data** — manufacturers (create/list/delete), service centers
   (create with supported brands / list / delete), branches (create/list/delete).
7. **Team management** — list users, create user with role (permission-gated to
   `user:manage`).
8. **Reports** — download assets/warranties/maintenance CSV (permission-gated).
9. **Language** — toggle AR⇄EN anywhere; direction + fonts switch live.

**Flows NOT present:** invoice entry, OCR scan-to-asset, warranty renewal,
asset edit/transfer/retire-from-UI, maintenance edit, user suspend/delete-from-UI,
company settings, any external/partner portal.
