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

# P Profile — Feature Matrix

> Read-only audit of code that exists **now**. "Implemented" means the code path
> exists end-to-end and is internally consistent — **not** that it was run/tested
> (see PROJECT_STATE.md §4). State legend:
>
> - **Implemented** — full code path exists (schema → API → UI where applicable).
> - **Partial** — some layers exist; one or more layers (usually UI or an action) missing.
> - **Placeholder** — schema/scaffold exists but no working behavior.
> - **Missing** — not present in the code.

## The 20-point audit

| # | Feature | State | Evidence / what exists | What's missing |
|---|---------|-------|------------------------|----------------|
| 1 | **Authentication** | **Implemented** | scrypt+salt hashing, HMAC-signed httpOnly cookie (7d), `requireAuth`; `/auth/register,login,logout,me`; login/register UI | Rate limiting, password reset, token revocation/refresh, email verification (OTP/SMS excluded by design) |
| 2 | **Multi-tenant companies** | **Implemented** (isolation) | `companies` tenant root; `companyId` on every business table; **every query scoped by `req.companyId`**; register bootstraps company+branch+owner | No company-management endpoints/UI (rename, plan, delete); single-company-per-user only |
| 3 | **Branches** | **Implemented** | Server CRUD (GET/POST/PATCH/DELETE), primary-branch delete guard; UI list/create/delete | No edit-branch UI (server PATCH exists); manager not branch-scoped |
| 4 | **Assets** | **Implemented** | Server CRUD + filters (status/branch/q) + relational detail + service-center link; UI list/search/filter/create/detail | No edit-asset UI; no explicit retire/dispose action in UI |
| 5 | **Warranty tracking** | **Implemented** | `warranties` (3 types), derived status + remainingDays (`shared/warranty.ts`); create/patch/delete; UI in asset detail | No expiry notifications/alerts engine |
| 6 | **Manufacturers** | **Implemented** | Server CRUD; UI list/create/delete | No edit UI (server PATCH exists) |
| 7 | **Service centers** | **Implemented** | Server CRUD + "supported brands" M:N to manufacturers; UI create-with-brands/list/delete; asset linking | No edit UI |
| 8 | **Maintenance records** | **Implemented** | CRUD + auto asset-status sync (open→`in_maintenance`, completed→`active`); UI add/list | No edit/status-change UI; no doc attach in maintenance UI (schema supports it) |
| 9 | **Warranty extensions** | **Implemented** (as type) | `warranty_type` enum includes `extended` + `protection_plan` | No renewal workflow / marketplace (future-ready only) |
| 10 | **Authorized service providers** | **Implemented** (centers) / **Missing** (portals) | Authorized service centers fully modeled | No external provider portal/login |
| 11 | **Reports** | **Implemented** | 3 report builders (assets/warranties/maintenance), `report:read` gated; UI page | PDF/XLSX/scheduled/filtered reports |
| 12 | **CSV exports** | **Implemented** | `toCsv()` RFC-4180 + UTF-8 BOM (Excel/Arabic safe); 3 download endpoints + UI links | — |
| 13 | **User roles** | **Implemented** (partial UI) | 5-role enum (owner/admin/manager/technician/viewer); users GET/POST/PATCH; UI list/create | No user edit/suspend/delete UI; no DELETE endpoint |
| 14 | **Permissions** | **Implemented** | Shared matrix `shared/permissions.ts`; server `requirePermission`; client `can()` hides controls | `manager` is company-wide, not branch-scoped |
| 15 | **Arabic RTL** | **Implemented** | Default `ar`, `dir=rtl`, IBM Plex Sans Arabic, logical CSS props, RTL-aware shell/nav | — |
| 16 | **English support** | **Implemented** | Full `en` dictionary, runtime toggle, persisted in localStorage | — |
| 17 | **Mobile responsiveness** | **Implemented** | Desktop sidebar + mobile bottom nav, responsive grids, mobile sheet modals | Not verified on real devices |
| 18 | **OCR integration** | **Missing** | Architecture-ready only (`documents`+`invoices` tables; extension documented) | No OCR service, no Vision call, no parsing |
| 19 | **Invoice storage** | **Partial / Placeholder** | `invoices` table + `assets.invoiceId` FK + `documents.type='invoice'` exist; an invoice **file** can be uploaded as a document on an asset | **No invoice CRUD/API/UI**; invoices are not a managed record |
| 20 | **Product profile pages** | **Implemented** (as Asset detail) | Asset Detail page = the "profile" (overview + warranties + maintenance + documents + service centers tabs) | No separate B2C product-profile concept (B2B-first by design) |

## Roll-up

- **Implemented:** 1,2,3,4,5,6,7,8,9 (as type),10 (centers),11,12,13 (partial UI),14,15,16,17,20
- **Partial:** 13 (UI), 19
- **Placeholder:** 19 (invoice records)
- **Missing:** 18 (OCR), 10 (provider portals), 9 (renewal flow)
