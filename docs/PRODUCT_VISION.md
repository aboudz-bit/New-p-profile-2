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

# P Profile — Product Vision

> **Status:** Product/architecture analysis only. No code, DB, or API changes.
> **This document supersedes** the earlier framing in `PROJECT_STATE.md` /
> `FEATURE_MATRIX.md`, which described the product as an "Asset Management
> System." **That was too narrow.** Asset Registry is **one B2B module**, not the
> product. The corrected vision is below.

---

## 1. Platform Vision

**P Profile is a Product Identity Platform.**

Every product gets a **permanent digital profile** — a single record that follows
the product across its entire life, independent of who owns it or who services it.
The profile is the source of truth for what the product *is*, what protects it,
what has happened to it, and who is responsible for it.

A product profile may hold:

- Product information (category, brand, model)
- Serial number (the identity anchor)
- Purchase invoice
- Warranty information
- Warranty extensions
- Maintenance history
- Repair history
- Authorized service centers
- Manufacturer information
- Ownership history
- Attachments and documents
- Product status

The same profile is **viewed through different lenses** depending on the actor:
a consumer sees "my product + warranty + reminders," a company sees "an asset +
branch + responsible employee," a service center sees "a job," and a manufacturer
sees "a registered unit." **One record, many roles.**

> **Where the current code stands vs. this vision:** the existing `assets` table
> is effectively the product-profile record (serial number, manufacturer, invoice
> link, warranties, maintenance, documents, status all attach to it). What the
> vision adds beyond today's code: **ownership history**, **reminders**, a
> **shared/public service-center & manufacturer directory** (today these are
> per-tenant only), and the **consumer + provider + manufacturer lenses** (today
> only the B2B/company lens exists). See `MODULE_MAP.md` for per-module status.

---

## 2. User Types

| Actor | Who | Primary lens on the profile |
|------|-----|------------------------------|
| **B2C Consumer** | Individuals owning personal products | "My products, warranties, reminders, service" |
| **B2B Company** | Businesses owning many assets across branches | "Asset registry, responsibility, maintenance ops, reporting" |
| **Service Provider** | Authorized service centers, maintenance companies, warranty providers | "Incoming jobs, serviced units, supported brands" |
| **Manufacturer** | Brand owners / OEMs | "Registered products, warranty verification, my service-center network" |
| **Platform Admin** | P Profile operator | Tenancy, directories, billing, abuse |

Tenancy mapping (grounded in current schema): a tenant is a `companies` row with
`type ∈ {business, individual}`. **B2C = an `individual` company with one branch.**
B2B = a `business` company with many branches. Service providers and manufacturers
need their **own actor model** (a partner/org type or a directory entity) — **not
yet present** in code beyond per-tenant `service_centers` / `manufacturers`.

---

## 3. Business Model

Layered monetization, broad funnel → high-value B2B/partner revenue:

1. **B2C freemium** — free personal vault (store products, track warranties);
   paid tier for unlimited products, reminders, document storage.
2. **B2B SaaS subscription** — per-seat / per-branch / per-asset tiers
   (`companies.plan` placeholder already exists). Asset registry, dashboards,
   reporting, multi-branch.
3. **Warranty renewal & extension commissions** — marketplace take-rate when a
   user renews/extends through the platform.
4. **Service-center lead generation** — paid placement / referral fees when a
   user requests maintenance and is routed to a provider.
5. **Manufacturer services** — paid product-registration, warranty-verification,
   and service-network management.
6. **Insurance / protection-plan distribution** — commission on plans sold.
7. **Data & analytics (aggregate, privacy-safe)** — product reliability, failure
   rates, service benchmarks for manufacturers.

> Today: only the SaaS-tenancy *placeholder* (`plan`) and warranty *type* model
> exist. No billing, marketplace, commissions, or directories are built.

---

## 4. Product Lifecycle

The profile is the spine across every stage:

```
Register / Acquire
   → create profile (manual, invoice, OCR, or manufacturer registration)
Ownership
   → assign owner (consumer) OR branch + responsible employee (company)
Protect
   → manufacturer warranty → extended warranty → protection plan / insurance
Operate
   → status tracking, reminders, document accrual
Service
   → request maintenance → route to authorized service center → repair history
Renew
   → warranty expiring → renewal/extension offer → marketplace
Transfer
   → ownership change (resale, gift, asset reassignment) → ownership history
Retire
   → end of life → retired / disposed, profile preserved as historical record
```

> Implemented stages in code: **Register (manual), Protect (warranties), Operate
> (status), Service (maintenance + centers), partial Retire (status enum).**
> Not built: ownership/transfer, reminders, renewal flow, OCR/manufacturer
> registration paths.

---

## 9. Future Marketplace Opportunities

(Numbered 9 to match the requested outline; details of 5–8 modules are in
`MODULE_MAP.md`.)

1. **Warranty Renewal Marketplace** — surface expiring warranties → competing
   renewal/extension offers from providers.
2. **Insurance & Protection-Plan Marketplace** — third-party plans sold against a
   profile at point of purchase or expiry.
3. **Service Marketplace** — consumers/companies post maintenance requests;
   authorized centers bid/accept; ratings and SLAs.
4. **Manufacturer Portals** — OEMs register products, verify warranties, manage
   their authorized-center network, push recalls/updates to profiles.
5. **Resale / Ownership-Transfer Marketplace** — verified product history (like a
   vehicle history report) increases resale trust and value.
6. **Parts & Accessories** — model-matched parts recommended on the profile.
7. **Extended-coverage Financing** — installment plans for renewals.
8. **Aggregate Reliability Data** — privacy-safe analytics products for
   manufacturers and insurers.

These are **opportunities, not commitments** — listed so the data model can keep
the seams open (it already does for most: documents, warranties-by-type,
manufacturer & service-center entities, per-tenant design).
