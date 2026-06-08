# P Profile — Database Schema

> Source of truth: [`shared/schema.ts`](../shared/schema.ts) (Drizzle ORM,
> PostgreSQL, `snake_case`, UUID PKs). Aligned with
> [`PRODUCT_PROFILE_DESIGN.md`](./PRODUCT_PROFILE_DESIGN.md). Schema is applied
> with `drizzle-kit push` (no versioned migrations yet — see limitations).

## Entity overview

```
parties (actor: consumer | business | manufacturer | service_center | warranty_provider | platform)
  ├─< branches                         (business org units)
  ├─< users (role, status, branchId)
  ├─< directory_entries                (manufacturers / service centers / warranty providers — Phase 1, no logins)
  └─ owns profiles via ↓

product_models (catalog)
  └─< product_profiles                 ← CENTRAL OBJECT (pProfileId permanent identity + QR)
        ├─< profile_associations       (party ↔ profile: owner/servicer/… , validFrom/To = ownership history)
        │     └─1:1 business_profile_context  (branch, responsibleUser, internalReference — B2B lens)
        ├─< warranties                 (manufacturer/extended/protection_plan, supersedesId chain)
        ├─< maintenance_records        (service history; serviceCenterId → directory_entries)
        ├─< purchase_records           (owner-private invoice/price)
        ├─< documents                  (also linkable to a maintenance record)
        └─< profile_service_centers    (profile ↔ service-center directory link, M:N)

activity_logs (audit + dashboard feed, party-scoped)
```

## Enums

| Enum | Values |
|------|--------|
| `party_type` | consumer, business, manufacturer, service_center, warranty_provider, platform |
| `user_role` | owner, admin, manager, technician, viewer |
| `user_status` | active, invited, suspended |
| `profile_status` | active, in_service, retired, disposed |
| `warranty_type` | manufacturer, extended, protection_plan |
| `maintenance_status` | open, in_progress, completed |
| `maintenance_type` | repair, service, inspection, part_replacement, other |
| `document_type` | invoice, warranty_certificate, service_report, other |
| `association_relationship` | owner, prior_owner, manufacturer, servicer, warranty_provider, viewer |
| `association_status` | pending, active, revoked |
| `directory_kind` | manufacturer, service_center, warranty_provider |
| `authorization_source` | platform_listed, business_designated, self_declared, manufacturer_verified¹ |
| `visibility` | private, shared |

¹ `manufacturer_verified` is reserved for Phase 2 and must not be set in Phase 1.

## Tables

### `parties`
Actor root. `type`, `name`, `nameAr`, `taxNumber`, `defaultCurrency` (SAR), `plan` (free).

### `branches`
`partyId` (cascade), `name`, `location`, `phone`, `isPrimary`. Index: `(partyId)`.

### `users`
`partyId` (nullable — reserved for platform super-admin), `branchId` (set null),
`email`, `name`, `passwordHash`, `role`, `status`, `locale`.
Indexes: **unique `(partyId, email)`**, `(partyId)`.

### `product_models`
Catalog. `name`, `category`, `brand`, `manufacturerKey`, `specs` (jsonb), `source`,
`createdByPartyId`. Index: `(category)`.

### `product_profiles` — central object
`pProfileId` (varchar, **unique**, always minted — primary identity + QR),
`productModelId` (set null), `displayName`, `category`, `brand`, `model`,
`serialNumber` (nullable — **secondary** anchor), `manufacturerKey`, `status`,
`notes`, `createdByPartyId`, `createdByUserId`.
Indexes: **unique `(pProfileId)`**, `(serialNumber)`, `(manufacturerKey, serialNumber)` (soft dedup hint). **No `partyId` — ownership lives in associations.**

### `profile_associations` — cross-actor link
`profileId` (cascade), `partyId` (cascade), `relationship`, `status`,
`validFrom`, `validTo` (null = current), `scope` (jsonb).
Indexes: `(profileId)`, `(partyId, relationship, status)`.

### `business_profile_context` — B2B lens
1:1 with a business owner association. `associationId` (cascade, **unique**),
`partyId`, `profileId`, `branchId` (set null), `responsibleUserId` (set null),
`internalReference`, `internalNotes`. Indexes: unique `(associationId)`, `(partyId)`, `(profileId)`.

### `directory_entries`
`ownerPartyId` (cascade), `kind`, `name`, `contactInfo`, `location`, `website`,
`authorizationSource` (service centers), `supportedBrands` (jsonb), `claimedByPartyId`.
Index: `(ownerPartyId, kind)`.

### `profile_service_centers`
`partyId`, `profileId` (cascade), `directoryEntryId` (cascade).
Indexes: **unique `(profileId, directoryEntryId)`**, `(partyId)`.

### `warranties`
`partyId` (cascade), `profileId` (cascade), `type`, `providerName`, `providerType`,
`providerContact`, `startDate`, `endDate`, `coverageSummary`, `supersedesId`
(coverage chain), `visibility` (default private), `shareableWithProvider`.
Status/remainingDays are **derived at read time**, never stored.
Indexes: `(partyId)`, `(profileId)`, `(partyId, endDate)`.

### `maintenance_records`
`partyId`, `profileId` (cascade), `serviceCenterId` → `directory_entries` (set null),
`date`, `type`, `status`, `description`, `providerName`, `cost`, `currency`, `notes`,
`visibility`. Indexes: `(partyId)`, `(profileId)`, `(partyId, status)`.

### `purchase_records` — owner-private
`partyId`, `profileId` (cascade), `merchant`, `invoiceNumber`, `purchaseDate`,
`total`, `currency`, `notes`. Indexes: `(partyId)`, `(profileId)`.

### `documents`
`partyId`, `profileId` (cascade, nullable), `maintenanceRecordId` (cascade, nullable),
`type`, `name`, `storageKey`, `url`, `mimeType`, `sizeBytes`, `visibility`,
`uploadedByUserId`. Indexes: `(partyId)`, `(profileId)`.

### `activity_logs`
`partyId` (cascade), `actorUserId` (set null), `entityType`, `entityId`, `action`,
`summary`, `metadata` (jsonb), `createdAt`. Index: `(partyId, createdAt)`.

## Cascade behavior summary

- Deleting a **party** cascades to its branches, users, directory entries,
  associations, and all party-scoped module rows.
- Deleting a **product_profile** cascades to its associations, business context,
  warranties, maintenance, purchase records, documents, and service-center links.
- `branchId` / `responsibleUserId` / `serviceCenterId` / `productModelId` use
  `SET NULL` so reference deletes don't destroy profiles or history.

See [`DATABASE_REVIEW`](./PHASE1_AUDIT.md) findings and
[`TECHNICAL_DEBT.md`](./TECHNICAL_DEBT.md) for recommended constraint hardening.
