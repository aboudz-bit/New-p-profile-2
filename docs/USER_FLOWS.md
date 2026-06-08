# P Profile — User Flows

> Flows implemented end-to-end in Phase 1 (UI → API → DB), validated at runtime.
> Aligned with [`PRODUCT_PROFILE_DESIGN.md`](./PRODUCT_PROFILE_DESIGN.md) §9–11.
> "Lens" = the same Product Profile viewed by a different actor.

## Registration (single page, two account types)

```
/register → choose account type
  ├─ Personal (consumer):  name, email, password
  │     → Party(consumer) + owner user (no branches)
  └─ Business:             company name, name, email, password
        → Party(business) + primary branch + owner user
  → session cookie set → redirect to Dashboard
```

## Login / Logout
- `/login` → email + password → cookie → Dashboard. `/auth/me` rehydrates on load.
- Logout (sidebar) → clears cookie + query cache → redirect to `/login`.

## Product Profile lifecycle (the spine)

```
REGISTER  → create profile (Registry → Add product). pProfileId + QR minted always.
            Business also sets branch + internal reference; purchase price optional (owner-private).
CLAIM     → Registry → Claim a product → enter P Profile ID → owner association (if unowned).
OPERATE   → status active ⇄ in_service; documents accrue.
PROTECT   → add warranties (manufacturer → extended → protection plan), coverage chain.
SERVICE   → record service history (optionally tied to a directory service center).
EDIT      → Edit modal updates identity, status (incl. retire/dispose), and B2B context.
RETIRE    → set status retired/disposed; profile preserved.
```

## B2C (consumer) flow
1. Register personal → Dashboard (no Branches/Users nav).
2. Registry → **Add product** (name, brand, model, serial, purchase) or **Claim** by P Profile ID.
3. Open profile → **Identity & QR** (copyable P Profile ID, QR to public preview),
   add **warranties**, **service history**, **documents**, link a **service center** from the directory.
4. Share the QR / P Profile ID → anyone scanning sees only the **safe public preview**.

## B2B (business) flow
1. Register business → primary branch + owner created.
2. Manage **Branches** and **Users** (roles: owner/admin/manager/technician/viewer).
3. Build the **Directory** (manufacturers, authorized service centers with an
   authorization source + supported brands, warranty providers).
4. Registry → **Add product** with **branch**, **internal reference** (shown as
   "Asset No." label), purchase price (owner-private).
5. Profile detail → warranties, service history (assign a service center),
   documents, link service centers. **Edit** updates identity + branch + internal ref + status.
6. **Dashboard** shows totals, in-service count, expiring/expired warranties, recent activity.

## Public QR preview flow (unauthenticated)
```
Scan QR / open /p/:pProfileId
  → safe card: product name, brand/model, category, status,
    "Registered on P Profile", serial-verified badge
  → "Log in to view full profile" (or link to Registry if already signed in)
```

## Permission-gated UI
- Consumer parties: Branches and Users nav hidden.
- `viewer`/`technician`: write controls hidden (and blocked server-side).
- All write controls mirror the server RBAC; the client never grants access the
  server wouldn't.
