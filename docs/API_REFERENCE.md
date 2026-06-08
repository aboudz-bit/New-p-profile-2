# P Profile — API Reference

> Base path: `/api`. All responses are JSON. Auth is a stateless HMAC-signed
> httpOnly cookie (`pp_session`, 7-day TTL) set on register/login. Tenant scoping
> is by the acting **party** (`req.partyId`), derived from the session.
> Validation uses Zod; validation failures return `422` with `{ error, details }`.
> Source: [`server/routes/`](../server/routes). Permissions: see [`RBAC_MATRIX.md`](./RBAC_MATRIX.md).

## Conventions

- **Auth required** unless marked _public_. Missing/invalid session → `401`.
- **Permission** column lists the required permission (enforced server-side).
- Tenant-scoped resources return `404` (not `403`) when the row exists in another
  party — existence is not leaked.
- Errors: `{ "error": string, "details"?: unknown }`. Codes: `401` auth, `403`
  permission/suspended, `404` not found, `409` conflict, `413` payload too large,
  `422` validation, `500` internal.

---

## Health & public

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | public | `{ ok, ts }` liveness. |
| GET | `/public/profiles/:pProfileId` | **public** | QR scan resolution → **safe preview only**: `{ pProfileId, productName, category, brand, model, status, registered, serialVerified, registeredAt }`. Never owner, price, invoice, documents, warranties, or service history. Invalid ID shape or unknown → `404`. |

## Auth — `/auth`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/auth/register` | public | `{ accountType: "business"\|"personal", companyName?, name, email, password, locale? }` | Creates a party (+ primary branch for business) + owner user; sets cookie. `companyName` required when `accountType="business"`. Returns `{ user }`. |
| POST | `/auth/login` | public | `{ email, password }` | Sets cookie, returns `{ user }`. Bad creds → `401`; suspended → `403`. |
| POST | `/auth/logout` | public | — | Clears cookie. |
| GET | `/auth/me` | required | — | `{ user }` with `partyType` + resolved `permissions`. |

`user` shape: `{ id, partyId, partyType, branchId, name, email, role, status, locale, permissions[] }`.

## Product Profiles — `/profiles`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/profiles` | auth | List profiles the party **owns** (active owner association). Query: `status`, `branchId`, `q` (matches name/serial/brand/model/pProfileId). Each row includes `branchName`, `internalReference`, `modelName`, `purchasePrice`, `currency`, `warrantyStatus` (rollup). |
| GET | `/profiles/:id` | auth | Full graph: model, warranties (with derived `status`/`remainingDays`, ordered by coverage type then date), `maintenanceRecords` (+ serviceCenter), `documents`, `purchase`, B2B `context` (branch/responsible/internalReference), `serviceCenterIds`. `404` if not owned. |
| POST | `/profiles` | `profile:write` | Body: `{ displayName, category?, brand?, model?, serialNumber?, manufacturerKey?, status?, notes?, branchId?, responsibleUserId?, internalReference?, purchaseDate?, purchasePrice?, currency? }`. Mints `pProfileId`, creates owner association, B2B context (business), and a purchase record if purchase fields given. |
| PATCH | `/profiles/:id` | `profile:write` | Partial update of profile fields + B2B context fields. |
| DELETE | `/profiles/:id` | `profile:write` | Deletes the profile (cascades modules). |
| POST | `/profiles/claim` | `profile:write` | Body `{ pProfileId }`. Claims an existing unowned profile → owner association. `404` unknown ID, `409` already owned. |
| PUT | `/profiles/:id/service-centers` | `profile:write` | Body `{ directoryEntryIds: string[] }`. Replaces the linked service-center set (validated to be the party's own `service_center` directory entries). |

## Warranties — `/warranties`

| Method | Path | Permission | Description |
|---|---|---|---|
| POST | `/warranties` | `warranty:write` | Body `{ profileId, type, providerName?, providerType?, providerContact?, startDate?, endDate?, coverageSummary?, supersedesId?, shareableWithProvider? }`. Returns row with derived `status`/`remainingDays`. `404` if profile not owned. |
| PATCH | `/warranties/:id` | `warranty:write` | Partial update (profileId immutable). |
| DELETE | `/warranties/:id` | `warranty:write` | Delete. |

## Maintenance / service history — `/maintenance`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/maintenance` | `maintenance:read` | All service records for the party. |
| POST | `/maintenance` | `maintenance:write` | Body `{ profileId, date?, type, status?, description?, serviceCenterId?, providerName?, cost?, currency?, notes? }`. A non-completed record moves an **active** profile to `in_service` (won't resurrect retired/disposed). |
| PATCH | `/maintenance/:id` | `maintenance:write` | Partial update. Setting `completed` returns an `in_service` profile to `active`. |
| DELETE | `/maintenance/:id` | `maintenance:write` | Delete. |

## Documents — `/documents`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/documents` | auth | List party documents; optional `?profileId`. |
| POST | `/documents` | `document:write` | Body `{ name, type?, profileId?, maintenanceRecordId?, mimeType?, contentBase64 }` (data-URL prefix tolerated). Max 25 MB. Stored via the storage adapter (local disk now). |
| DELETE | `/documents/:id` | `document:write` | Delete metadata (file remains on disk — see limitations). |

## Directory — `/directory`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/directory` | auth | List the party's directory entries; optional `?kind=manufacturer\|service_center\|warranty_provider`. |
| POST | `/directory` | `directory:write` | Body `{ kind, name, nameAr?, contactInfo?, location?, website?, authorizationSource?, supportedBrands? }`. `authorizationSource` (Phase 1: `platform_listed`/`business_designated`/`self_declared`) and `supportedBrands` apply to `service_center` only; defaults to `self_declared`. |
| PATCH | `/directory/:id` | `directory:write` | Partial update (kind immutable). |
| DELETE | `/directory/:id` | `directory:write` | Delete. |

## Branches — `/branches` (business lens)

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/branches` | auth | List party branches. |
| POST | `/branches` | `branch:manage` | Create. |
| PATCH | `/branches/:id` | `branch:manage` | Update. |
| DELETE | `/branches/:id` | `branch:manage` | Delete (no server primary-branch guard yet — see tech debt). |

## Users — `/users` (business lens)

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/users` | `user:manage` | List party users (no password hash). |
| POST | `/users` | `user:manage` | Create `{ name, email, password, role, branchId?, locale? }`. Only an `owner` may create an `owner`. Duplicate email in party → `409`. |
| PATCH | `/users/:id` | `user:manage` | Update name/role/status/branchId/password. Only an `owner` may promote to `owner`. (No DELETE endpoint yet.) |

## Dashboard — `/dashboard`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard/stats` | auth | `{ totalProfiles, profilesInService, openMaintenance, expiredWarranties, expiringWarranties, recentActivity[] }`. The 30-day expiring window mirrors `EXPIRING_WINDOW_DAYS`. |
