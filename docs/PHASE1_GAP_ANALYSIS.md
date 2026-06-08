# P Profile — Phase 1 Gap Analysis

> What Phase 1 (per [`PRODUCT_PROFILE_DESIGN.md`](./PRODUCT_PROFILE_DESIGN.md) §12)
> promised vs. what is implemented, evaluated per actor. **Findings only — no
> assumptions.** "Gap" = design said Phase 1 but it's missing/partial. "By design"
> = intentionally Phase 2.
>
> **Update (gap-closure pass):** the four targeted gaps — **Product Model catalog,
> Responsible User UI, Status History, Claim Requests** — are now **closed** and
> validated (API + browser). Marked ✅ Closed below. Remaining open items
> (edit UIs for other entities, share_grants) are noted at the end.

## A. Design Phase 1 scope — coverage

| Phase 1 item (design) | Status | Notes |
|---|---|---|
| `product_profiles` + always-minted `pProfileId` + QR | ✅ | Verified |
| Public QR scan → safe preview | ✅ | Leak-checked |
| Consumer + business parties with logins | ✅ | |
| `profile_associations` (owner) + `business_profile_context` | ✅ | |
| Service centers as directory + service history (Option B) | ✅ | |
| All 3 warranty types + coverage chaining | ✅ | |
| Modules: warranties, service history, purchase (owner-private), documents | ✅ | |
| Private-by-default visibility | ✅ (implicit) | Enforced via owner-party scoping; `visibility` column present |
| **Product model catalog (manual)** | ✅ **Closed** | `GET/POST /api/models` (per-party catalog). Create/Edit profile can **select an existing model or create a new one**; `productModelId` is linked. Free-text brand/model retained as fallback. |
| **`status_history` module** | ✅ **Closed** | `status_history` table; entries recorded on create (`∅→active`), profile status edit (with reason), and maintenance auto-flips (`active→in_service`, `in_service→active`). Shown in the **History** tab. |
| **`ownership_events` module** | 🟦 Substituted | No dedicated table; ownership history is derivable from `profile_associations.validFrom/To`. Acceptable but not a first-class module. |
| **Explicit `share_grants`** | ⚠️ **Gap** (not in this pass) | Still not implemented. Sharing limited to service-center links + warranty `shareableWithProvider` flag. Acceptable for Phase 1 minimal sharing; revisit in Phase 2. |
| **`claim_requests` + flow** | ✅ **Closed** | `claim_requests` table. `POST /api/profiles/claim`: **unowned → direct claim**; **owned → pending request** with proof note + optional file. Owner sees incoming requests (and on profile detail) and can **reject**; requester can **cancel**. Approval/transfer is Phase 2. |
| Manufacturers / warranty providers as directory entries | ✅ | |

## B. Consumer perspective
**Works:** register personal; add products (select/create a **product model** or use
free-text); **claim** by P Profile ID (direct if unowned, else a pending request
with proof note/file); P Profile ID + QR; warranties (3 types); service history;
documents; find/link a directory service center; public preview; edit profile
(incl. retire/dispose); **status history**.
**Gaps:** no warranty/service **edit** UI. **By design (P2):** reminders,
ownership transfer/resale (claim approval that transfers ownership).

## C. Business perspective
**Works:** register business (primary branch + owner); branches; users + roles;
directory (manufacturers / authorized service centers w/ authorization source +
supported brands / warranty providers); registry with **branch** + **internal
reference**; warranties; service history (assign service center); documents;
dashboard; edit profile.
Also: **product model** select/create and **responsible user** selector are now in
Add/Edit; **status history** is shown.
**Gaps (remaining):**
- No edit UI for warranty/maintenance/branch/user/directory (backend PATCH exists for most).
- No user delete/suspend UI; no org/company settings (`org:manage` unused).
- `manager` role is party-wide, not branch-scoped.
**By design (P2):** reports/CSV (removed from Phase 1), cross-branch transfer.

## D. Service Center perspective
Phase 1 = **directory entity only (Option B)** — no login/portal. **Works:**
created as a directory entry with `authorizationSource` (platform_listed /
business_designated / self_declared) and supported brands; linkable to profiles;
referenced on service records.
**By design (P2):** service-center login, inbound job queue, accept/decline, SLA,
ratings, `manufacturer_verified` authorization.

## E. Warranty Provider perspective
Phase 1 = **data only**. **Works:** directory `warranty_provider` entries;
warranties capture `providerName` / `providerType` / `providerContact` and a
`shareableWithProvider` readiness flag.
**By design (P2):** provider login/portal, warranty verification, actual shared access.

## F. Phase 1 closure status
1. ✅ **Product Model catalog** — wired into Create/Edit (select existing or create new); `productModelId` linked; free-text fallback kept.
2. ✅ **Responsible User** — selector in Add/Edit (business lens); shown in detail.
3. ✅ **Status History** — `status_history` table; recorded on create/edit/service flips; **History** tab.
4. ✅ **Claim Requests** — unowned → direct claim; owned → pending request with proof; reject/cancel. (Approval/transfer = Phase 2.)

**Remaining (open) Phase-1-adjacent items — not in this pass:**
- **Edit UIs** for warranty / maintenance / branch / user / directory (backend PATCH exists for most).
- **User delete/suspend UI**; **org/company settings** (`org:manage` unused).
- **`share_grants`** (minimal sharing only today).
- **`manager` branch-scoping**.

> These remaining items are tracked in [`TECHNICAL_DEBT.md`](./TECHNICAL_DEBT.md).
> The four targeted gaps are closed and validated (API + browser).
