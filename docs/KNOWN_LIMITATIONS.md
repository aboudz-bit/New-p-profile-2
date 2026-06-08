# P Profile — Known Limitations

> Honest list of Phase 1 boundaries. Many items are **intentional** per
> [`PRODUCT_PROFILE_DESIGN.md`](./PRODUCT_PROFILE_DESIGN.md) (deferred to Phase 2);
> others are real gaps to address before scale/production. Nothing here is a
> blocker for a Phase 1 demo/pilot.

## Intentional Phase 1 boundaries (by design)
- **No actor portals** for manufacturers, service centers, or warranty providers.
  They exist as **directory entries** only (no logins, no inbound job queue).
- **No marketplace, payments, insurance, OCR, SMS, or OTP.**
- **Cross-actor sharing is minimal**: profiles are accessed by their owner party;
  the only cross-actor links are service-center directory linking and the warranty
  `shareableWithProvider` flag. Association `scope` / share-grant enforcement and
  multi-actor read access are Phase 2.
- **Directories are per-party**, not a shared global directory (Phase 2).
- **`manufacturer_verified` authorization is reserved** — Phase 1 only allows
  `platform_listed` / `business_designated` / `self_declared`.
- **Product models** are platform/manual only; manufacturer claim/verify is Phase 2.
- **Auth is email/password only** (no OTP/SMS by design).

## Security limitations
- **Documents served unauthenticated from `/uploads`.** Files live at
  `/<partyId>/<uuid>-<name>` (two UUIDs → effectively unguessable), but there is no
  auth check on the static path, so a leaked URL is accessible. *Recommendation:*
  add an authenticated download route that checks ownership/visibility before
  streaming. (Medium severity; mitigated by unguessable keys.)
- **Sessions are stateless and non-revocable** until the 7-day TTL: suspending a
  user or changing a password does not invalidate existing cookies. *Recommendation:*
  a token version/`tokenVersion` column or server-side session store.
- **No login rate limiting / lockout.** Brute-force protection is absent. Security
  headers are set (nosniff, frame-options, referrer-policy) but there is no CSP/HSTS.
- **No CSRF token** beyond `sameSite=lax` (adequate for same-origin cookie + JSON,
  but document if embedding cross-origin later).
- **File upload accepts any MIME type** (size-capped at 25 MB). No content scanning.
- **Deleting a document removes the DB row but not the file on disk** (orphaned blob).

## Data / scale limitations
- **No versioned migrations** — schema applied via `drizzle-kit push`. Risky once
  real data exists.
- **No pagination** on list endpoints (`/profiles`, `/directory`, `/users`,
  `/maintenance`) — fine for demo, not for large tenants.
- **Local-disk document storage** — single-node only; not durable/replicated.
- **Stateless signed sessions** — horizontal scaling needs shared secret (fine) but
  revocation/observability needs a store.
- **`manager` role is party-wide**, not branch-scoped (over-permissive for
  multi-branch businesses).
- **Soft dedup only**: `(manufacturerKey, serialNumber)` is a non-unique index;
  duplicate physical units could be registered. Claim/merge is manual.

## Functional gaps (UI present? backend present?)
| Capability | Backend | UI | Notes |
|---|---|---|---|
| Edit Product Profile | ✅ | ✅ | Added in this audit. |
| Edit warranty | ✅ (PATCH) | ❌ | Only add/delete in UI. |
| Edit/transition maintenance | ✅ (PATCH) | ❌ | Only add in UI. |
| Edit branch / user | ✅ (PATCH) | ❌ | Only add/list (+ delete branch) in UI. |
| Delete user / suspend | ❌ (no DELETE) | ❌ | PATCH status exists; no UI. |
| Edit directory entry | ✅ (PATCH) | ❌ | Add/list/delete in UI. |
| Org/company settings | ❌ | ❌ | `org:manage` reserved; no endpoint. |
| Ownership transfer | ❌ | ❌ | Associations model supports it; no flow. |
| Reminders / notifications | ❌ | ❌ | Phase 2. |
| Reports / CSV export | ❌ | ❌ | Removed from Phase 1 scope. |

## Operational limitations
- **No automated tests / CI.**
- **No observability** (metrics/tracing/error tracking) — console logging only.
- **`tsx watch` (`npm run dev`) cold start is slow** on Windows (~25–40s to bind);
  the production build boots in <1s. Not a code bug.
