# P Profile — Product Profile Architecture (Source of Truth)

> **Status:** Approved design. **No code, no migrations, no database changes** were
> made to produce this document. It is the architectural source of truth for
> implementation.
>
> **This document supersedes** the earlier asset-framed documents
> (`PROJECT_STATE.md`, `FEATURE_MATRIX.md`, `ARCHITECTURE.md`, the asset-centric
> parts of `PRODUCT_VISION.md` / `MODULE_MAP.md`). Where they conflict, **this
> document wins.**
>
> **Last decisions locked:** terminology migration, identity model, Phase 1
> service centers (Option B), Phase 1 warranty providers, QR public preview.

---

## 1. Vision

**P Profile is a Product Identity Platform — not an Asset Management System.**

The **Product Profile** is the permanent digital identity of a single physical
product, persisting across its **entire lifecycle** and across **all actors**:

> **Consumer · Business · Manufacturer · Service Center · Warranty Provider**

One product = one profile = one permanent identity, viewed through different
**lenses** depending on who is looking. The Product Registry that a business sees,
the personal vault a consumer sees, the registered unit a manufacturer sees, and
the service job a center sees are **all the same underlying Product Profile**.

The Product Profile is the **primary object**. Everything else — product models,
warranties, service history, invoices, ownership, manufacturers, service centers,
branches — is a **module or actor attached to the profile**.

---

## 2. Core principles (non-negotiable)

1. **Product Profile is the central object.** No "asset" entity exists in the data
   model. "Asset" may appear **only** as an optional business-facing display label.
2. **P Profile ID is the primary identity.** Every profile receives a permanent
   `pProfileId` and a QR identity — **always**, whether or not a serial exists.
3. **Serial number is secondary.** It is a verification/deduplication attribute,
   never an identity requirement. No product is ever rejected for lacking one.
4. **The profile is not tenant-owned.** It has no `companyId`. Actors attach via
   permissioned, time-bounded **associations**.
5. **Private by default.** Every module row is private to its author/owner.
   Sharing is always explicit and permission-based.
6. **One record, many lenses.** Multiple actors may be associated with the same
   profile simultaneously; each sees only what its association scope permits.

---

## 3. Locked Phase 1 decisions

| # | Decision |
|---|----------|
| 1 | **Authorized Service Centers.** In Phase 1, "authorized" = one of `platform_listed`, `business_designated`, `self_declared`. `manufacturer_verified` is **Phase 2** and must **never** be claimed in Phase 1 unless a manufacturer is actually onboarded. |
| 2 | **Service Centers (Option B).** Service history is recorded by the **owner/business** in Phase 1. Service centers exist as **directory entries** that can be linked to Product Profiles. **No service-center login portal in Phase 1.** Portal, job queue, accept/decline, SLA, ratings = Phase 2. |
| 3 | **Warranty Providers.** No login portals in Phase 1. Phase 1 captures provider **name, type, contact info**, the **warranty/protection-plan record**, and a **shareable flag / future-access readiness**. Provider portal + verification = Phase 2. |
| 4 | **Terminology migration.** The current asset-framed schema is **superseded**. Build around Product Profile. "Asset" survives only as an optional business-facing label, never in the platform data model. |
| 5 | **QR / P Profile ID.** Every Product Profile receives a permanent **P Profile ID** + **QR identity**. **Public QR scan resolution exists in Phase 1** but shows only a **safe public preview** unless the viewer has permission. |

---

## 4. Identity model

### 4.1 Two identity objects (catalog vs. unit)

- **Product Model** — the catalog entry ("what kind of thing it is"): manufacturer,
  model name, category, specs. Created by the **platform** (manual; OCR fast-follow)
  in Phase 1; manufacturer-claimable/verifiable in Phase 2.
- **Product Profile** — the **unit** ("this specific physical item"). One row per
  real-world object. **The central object.** References a Product Model (nullable
  until classified).

### 4.2 Identity anchors

| Anchor | Role | Required? |
|---|---|---|
| **`pProfileId`** | **Primary, permanent platform identity.** Backs the QR. Used for all lookups, scans, claims, cross-actor references. | **Always** generated |
| `serialNumber` + `manufacturerKey` | **Secondary** verification + dedup signal. Soft-unique when both present. | Never required |

A profile with no serial is fully first-class. Dedup uses the secondary anchor
**only as a hint** for claim/merge — never as the identity.

### 4.3 QR / public scan resolution (Phase 1)

- Each profile has a QR encoding its `pProfileId`.
- A **public scan endpoint** resolves `pProfileId` → a **safe public preview**
  (e.g. product model/category, "registered on P Profile", verification status)
  — **never** owner identity, invoice, price, documents, or private modules.
- If the scanning viewer is authenticated **and** holds a qualifying association,
  the resolver returns the permitted lens instead of the public preview.

---

## 5. Proposed database entities

> Conceptual definitions only. Field lists describe intent, not DDL.

### Ring 0 — The central object

**`product_profiles`** — one physical unit. The spine of the system.
- `pProfileId` — permanent primary identity (always minted); QR source.
- `productModelId` → `product_models` (nullable until classified).
- `serialNumber` (nullable), `manufacturerKey` (nullable) — secondary verification anchor.
- `category`, `displayName` (denormalized convenience).
- `currentStatus` ∈ { `active`, `in_service`, `retired`, `disposed` }.
- `createdByPartyId` (provenance), `createdAt`, `updatedAt`.
- **No `companyId`. No owner column.** Ownership/tenancy live in associations.

### Ring 1 — Identity & catalog

**`product_models`** — catalog ("what kind of thing").
- `id`, `manufacturerId` (nullable directory ref), `name`, `nameAr`, `category`, `specs` (jsonb).
- `source` ∈ { `platform`, `ocr`, `manual`, `manufacturer` }.
- `verifiedByManufacturer` (bool; Phase 2), `mergedIntoId` (nullable; dedupe/merge).

### Ring 2 — Actors (Party model)

**`parties`** — replaces "company is the only tenant."
- `type` ∈ { `consumer`, `business`, `manufacturer`, `service_center`, `warranty_provider`, `platform` }.
- `name`, `nameAr`, `status`, `defaultCurrency`, `plan` (billing seam).
- **Phase 1 logins:** `consumer`, `business`, `platform`. `manufacturer`,
  `service_center`, `warranty_provider` exist in Phase 1 as **directory entries**
  (see Ring 2b); they gain login portals in Phase 2.

**`branches`** — business-internal. → `parties` (business type only), `isPrimary`.

**`users`** — login identities. → `parties`, optional `branchId`,
`role` (intra-actor RBAC), email unique per party, `locale`.

### Ring 2b — Directories (Phase 1 actors without logins)

**`directory_entries`** — lightweight, **unclaimed** records used for linking and
discovery before an actor has a real account.
- `kind` ∈ { `manufacturer`, `service_center`, `warranty_provider` }.
- `name`, `nameAr`, `contactInfo`, `location`, `website`.
- `claimedByPartyId` (nullable; set when a real Party claims it in Phase 2).

**`service_authorizations`** — what makes a service center "authorized."
- `serviceCenterRef` (directory entry in Phase 1; party in Phase 2).
- `scope` (manufacturer/model the center may service — "supported brands," generalized).
- `authorizationSource` ∈ { `platform_listed`, `business_designated`, `self_declared` }
  (Phase 1) — **`manufacturer_verified` reserved for Phase 2.**

### Ring 3 — The cross-actor link (the heart)

**`profile_associations`** — every Party↔Profile relationship.
- `profileId`, `partyId`, `relationship` ∈
  { `owner`, `prior_owner`, `manufacturer`, `servicer`, `warranty_provider`, `viewer` }.
- `validFrom`, `validTo` (null = current) → **ownership history derives from this**.
- `status` ∈ { `pending`, `active`, `revoked` } → powers claim & transfer.
- `scope` → which modules/fields this party may read/write on this profile.

**`business_profile_context`** — the **B2B lens data that belongs to the
association, not the global profile**. 1:1 with a business-owner association.
- `associationId`, `branchId`, `responsibleUserId`, `internalReference`
  (the business's own label — may be surfaced as "Asset No." in the business UI),
  `internalStatus`, `internalNotes`.

### Ring 4 — Modules (attach to profile; carry provenance + visibility)

Every module row carries `profileId`, `authorPartyId` (provenance), and a
`visibility` scope.

| Entity | Key fields | Default visibility |
|---|---|---|
| **`warranties`** | `type` ∈ { `manufacturer`, `extended`, `protection_plan` }; `providerRef` (directory/free-text); `startDate`, `endDate`; `coverageSummary`; `supersedesId` (coverage chain); status **derived** (not stored) | owner-private; shareable → warranty provider / manufacturer |
| **`maintenance_records`** (service history) | `type`, `status`, `date`, `cost`, `currency`, `serviceCenterRef`, `description`; recorded by owner/business in Phase 1 | owner + linked service center |
| **`invoices`** / purchase | `merchant`, `invoiceNumber`, `purchaseDate`, `total`/price, `currency` | **owner-private, always** |
| **`documents`** | `storageKey`, `url`, `mimeType`, `sizeBytes`, per-doc `visibility` | inherits parent module; per-doc override |
| **`ownership_events`** | paired with association open/close → resale-history timeline | profile-shared (the *fact*, not the price) |
| **`status_history`** | profile status changes over time | shared with active associations |

### Ring 5 — Sharing, claiming, audit

**`share_grants`** — explicit cross-party sharing.
- `profileId`, grantor party, grantee (party or directory ref), module(s),
  permission, `expiresAt` (nullable).

**`claim_requests`** — a party claims a profile via `pProfileId`/serial + proof →
on approval, creates/activates an association. Drives dedupe.

**`activity_logs`** — audit + recent-activity feed, scoped by party + profile.

---

## 6. Relationship map

```
                         ┌─────────────────┐
                         │  product_models │  (platform/OCR now; mfr-verified Phase 2)
                         └────────┬────────┘
                                  │ 1:N
                                  ▼
   parties ──< branches      ┌──────────────────────────┐
     │  │         │          │     PRODUCT_PROFILE        │  ← central object
     │  └< users ─┘          │     pProfileId (primary)   │  + QR
     │                       │     serial? + mfrKey?      │  (secondary verification)
     │                       └───────┬────────────────────┘
     │  profile_associations         │  modules attach to profileId
     └──────────< (M:N) >────────────┤
        party ↔ profile              ├──< warranties (3 types, chained, derived status)
        relationship, scope,         ├──< maintenance_records (service history)
        validFrom/To, status         ├──< invoices / purchase (owner-private)
              │                       ├──< documents (per-doc visibility)
              │ 1:1 (business owner)  ├──< ownership_events
              ▼                       └──< status_history
      business_profile_context
      (branch, responsibleUser,      directory_entries ─ mfr / service center / provider
       internalReference)            service_authorizations ─ authorizationSource (P1 sources)
                                      share_grants · claim_requests · activity_logs
```

**One profile → many associations → many parties.** Consumer, business, service
center, (Phase 2) manufacturer and warranty provider can all reference the **same**
profile, each constrained by its association scope.

---

## 7. Permission model (three tiers)

1. **Platform tier** — P Profile operators (`platform` party): tenancy,
   directories, dedupe/merge, abuse, claim approvals.
2. **Intra-actor RBAC** — the business-internal matrix, kept verbatim **inside a
   business party**: `owner` / `admin` / `manager` / `technician` / `viewer`.
   Governs what a business's own users do on profiles the business is associated with.
3. **Per-profile association scope** — the cross-actor layer. `profile_associations.scope`
   (+ `share_grants`) decides what an **external** party may see/do on a **specific**
   profile, at module/field granularity.

**Effective permission = intersection of (intra-actor RBAC) ∧ (association scope)
∧ (module visibility).** A business `viewer` who shares a profile with a service
center can never expose more than `viewer` may see.

### 7.1 Visibility defaults (private by default)

| Module | Default | Explicit-share targets |
|---|---|---|
| Invoice / purchase price | **owner-private (never auto-shared)** | — |
| Maintenance / service history | owner + the linked service center | additional centers, manufacturer (P2) |
| Warranty / protection plan | owner-private | warranty provider, manufacturer |
| Documents | inherit parent module | per-doc override |
| Product identity (model, category, status, ownership *fact*) | visible to active associations + safe public preview | — |

---

## 8. Warranty & protection-plan model (Phase 1)

All three coverage types are **first-class in Phase 1** (data model + lifecycle),
even though **payments/marketplace are Phase 2**:

- `warranties.type` ∈ { `manufacturer`, `extended`, `protection_plan` }.
- **Coverage chaining** via `supersedesId`: a profile's coverage timeline reads
  manufacturer → extended → protection plan; an extension *continues* prior coverage.
- **Status is derived, never stored** (`active` / `expiring_soon ≤ 30d` / `expired`
  / `unknown`) — carried over from the existing warranty math.
- **Provider** captured as `providerRef` (directory entry or free text in Phase 1)
  with name, type, contact info, and a **shareable flag** so coverage is
  *future-access-ready* for the provider portal in Phase 2.
- **Renewal/extension is a Phase 1 lifecycle action** (create a new linked
  coverage). **Offers, payments, commissions, provider verification = Phase 2.**

---

## 9. Product lifecycle flow (profile-centric)

```
REGISTER ─ any actor creates a profile → pProfileId + QR minted ALWAYS
   │        (manual / OCR / bulk)
   ▼
CLASSIFY ─ link to product_model (match existing or create from OCR/manual)
   │        secondary dedup check on (mfrKey, serial) if present
   ▼
ASSOCIATE ─ creator gets an association (owner / servicer / ...)
   │         business owner also gets business_profile_context
   ▼
PROTECT ─ warranties: manufacturer → extended → protection plan (chained, derived status)
   ▼
OPERATE ─ status changes, documents accrue (reminders = Phase 2)
   ▼
SERVICE ─ link a directory service center; owner/business records service history
   │        (Option B); shareable per scope
   ▼
RENEW ─ extend/continue coverage (lifecycle now; marketplace Phase 2)
   ▼
TRANSFER ─ close owner association (→ prior_owner), open new owner association;
   │         ownership_events records the fact; prior owner's private modules stay private
   ▼
RETIRE ─ status retired/disposed; profile preserved as permanent historical record
```

The `pProfileId` is immortal; **only associations change** across the item's life.

---

## 10. B2B flow

1. Business registers → Party(`business`) + primary branch + owner user.
2. Business adds a product → creates/links a **Product Profile** (global) + an
   **owner association** + **`business_profile_context`** carrying branch,
   responsible user, and `internalReference` (optionally shown as "Asset No.").
3. Internal users operate under intra-actor RBAC. The **"Product Registry"** is the
   business lens over global profiles.
4. Warranties, service history, invoices, documents attach to the profile, default
   **private to the business**.
5. To service an item, the business links a **directory service center** and records
   service history (Option B); may explicitly share modules with that center.
6. Dashboards/reports operate over the profiles the business is associated with
   (re-pointed from `companyId` to "active associations of this party").

## 11. B2C flow

1. Consumer signs up → Party(`consumer`), one implicit user, no branches.
2. Consumer adds a product two ways:
   - **Register** — manual or OCR → new Product Profile + `pProfileId`/QR + owner association.
   - **Claim** — scans a QR / enters `pProfileId` or serial for an existing profile →
     `claim_request` → on verification, an owner association. **No duplicate record.**
3. Invoice & price are **owner-private**; warranties tracked with derived status.
4. Consumer links a **directory service center** and records/keeps service history;
   may share with the center.
5. Consumer can **transfer** the product (resale/gift) → new owner association; the
   buyer inherits verified history while the seller's private invoice stays private.

Same modules, same central object — only the **lens and entry path** differ.

---

## 12. Phase 1 vs Phase 2

### Phase 1 — Identity foundation + owner lenses + service & full warranty lifecycle
- `product_profiles` with always-minted `pProfileId` + QR; serial/mfrKey secondary.
- **Public QR scan resolution → safe public preview** (full lens only with permission).
- `product_models` (manual; OCR fast-follow).
- `parties` (**consumer, business, platform** with logins), `users`, `branches`, intra-actor RBAC.
- `profile_associations` (owner, prior_owner, servicer, viewer) + `business_profile_context`.
- **Service centers as directory entries** linkable to profiles; **service history
  recorded by owner/business** (Option B); `service_authorizations` with Phase 1
  sources (`platform_listed`, `business_designated`, `self_declared`).
- **All three warranty types** + coverage chaining + derived status; **warranty
  providers as directory/data** (name, type, contact, shareable flag) — no portal.
- Modules: warranties, service history, invoices/purchase (owner-private), documents,
  status_history, ownership_events.
- Private-by-default visibility + explicit `share_grants`.
- `claim_requests` + serial/`pProfileId` dedupe; B2C register/claim/transfer; B2B Product Registry.
- Manufacturers & warranty providers present as **directory entries** only.

### Phase 2 — Actor portals, marketplaces, intelligence
- **Manufacturer portal:** claim/verify/correct models, register units,
  **`manufacturer_verified`** authorization of service centers, recalls, model analytics.
- **Service-center portal:** login, inbound job queue, accept/decline, SLA, ratings.
- **Warranty-provider portal:** login, warranty verification, provider access.
- **Reminders/notifications engine.**
- **Marketplaces:** warranty renewal, protection plans, insurance distribution,
  commissions, **billing/subscriptions**.
- **Transfer/resale marketplace** with verified history reports.
- **Aggregate reliability analytics** (privacy-safe, model-level).
- **Production hardening:** versioned migrations, tests/CI, S3/GCS storage,
  pagination, revocable sessions, rate limiting, observability.

---

## 13. Migration / supersession note

- The current `assets`-framed schema is **superseded**, not evolved. Phase 1
  **re-models the core** around `product_profiles`.
- Mapping for reference: old `assets` → `product_profiles` + a business **owner
  association** + `business_profile_context`; old per-tenant `manufacturers` /
  `service_centers` → `directory_entries`; old `companyId` scoping → **active
  associations of a party**; serial uniqueness → secondary verification anchor.
- **"Asset"** appears only as an optional business-facing label, never in the
  platform data model, API, or platform vocabulary.

---

## 14. Open items deferred to Phase 2 (explicitly out of Phase 1 scope)

Manufacturer onboarding & verification · service-center/provider logins & portals ·
job queue / accept-decline / SLA / ratings · notifications & reminders · payments,
renewals marketplace, insurance distribution, commissions · billing/subscriptions ·
resale marketplace · aggregate analytics · production hardening (migrations, CI,
cloud storage, pagination, session revocation, rate limiting, observability).

---

*End of source-of-truth design. No code, migrations, or database changes were made.*
