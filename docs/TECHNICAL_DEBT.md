# P Profile — Technical Debt

> Prioritized. "Phase 2" = intentionally deferred per design; "Debt" = should be
> addressed before scale/production even though Phase 1 functions. Severity:
> 🔴 high · 🟠 medium · 🟡 low.

## Schema & data
| Sev | Item | Why | Suggested fix |
|---|---|---|---|
| 🔴 | No versioned migrations (`drizzle-kit push` only) | Unsafe schema evolution once real data exists | Adopt `drizzle-kit generate` + a migrate step in deploy; stop using `push` post-data |
| 🟠 | Soft dedup on `(manufacturerKey, serialNumber)` | Duplicate physical units can be registered | Add a **partial unique** index where both columns are non-null |
| 🟠 | No DB guarantee of a single active `owner` per profile | App enforces it on claim, but two owner associations are possible via races/seed bugs | Partial unique on `(profileId)` where `relationship='owner' AND status='active'` |
| 🟡 | No pagination on list endpoints | Large tenants return unbounded rows | Add limit/offset or keyset pagination + server sort |
| 🟡 | `directory.authorizationSource` allows `manufacturer_verified` at the type level | Phase 1 must not use it; only app code restricts | Keep app guard; optionally a CHECK until Phase 2 |

## Security
| Sev | Item | Fix |
|---|---|---|
| 🟠 | Documents served unauthenticated from `/uploads` | Authenticated download route enforcing ownership/visibility; keep disk private |
| 🟠 | Non-revocable stateless sessions | `tokenVersion` column (bump on suspend/password change) or server session store |
| 🟠 | No login rate limiting / lockout | In-memory or store-backed limiter on `/auth/login` + `/auth/register` |
| 🟡 | No CSP/HSTS | Add CSP + HSTS at app or proxy (HSTS only over TLS) |
| 🟡 | Document delete orphans disk file | Delete blob via storage adapter on row delete |
| 🟡 | Uploads accept any MIME, no scan | MIME allowlist + size already capped; optional AV scan |

## Backend code
| Sev | Item | Fix |
|---|---|---|
| 🟠 | No server guard against deleting the **primary** branch | UI hides it, but the API allows it | Reject delete when `isPrimary` (or when it's the last branch) |
| 🟡 | No DELETE/soft-delete for users; no suspend UI | Add DELETE (or status=suspended) endpoint + UI |
| 🟡 | `org:manage` permission has no endpoint | Add company/party settings endpoints (rename, default currency, plan) |
| 🟡 | Activity logging is best-effort and untyped `entityType`/`action` strings | Consider enums/const unions for consistency |
| 🟡 | `manager` role is party-wide, not branch-scoped | Introduce branch-scoped checks for `manager` |

## Frontend code
| Sev | Item | Fix |
|---|---|---|
| 🟡 | Detail/list use `any` for fetched data | Add shared response types (derive from server) for end-to-end typing |
| 🟡 | Edit UIs missing for warranty/maintenance/branch/user/directory | Add edit modals (backend PATCH exists for most) |
| 🟡 | Maintenance `type` values shown raw (not translated) in list/select | Add `mtype.*` i18n keys |
| 🟡 | No optimistic UI / toast feedback on mutations | Add toasts and error surfaces beyond inline modal errors |

## Tooling / ops
| Sev | Item | Fix |
|---|---|---|
| 🔴 | No automated tests / CI | Unit (warranty math, permissions, identity), API integration, a few E2E; wire CI |
| 🟠 | No observability | Structured logging, error tracking, basic metrics |
| 🟡 | `db:push` blocks on prompt (`strict: true`) in CI | Use `--force` in non-interactive contexts, or move to migrations |
| 🟡 | `tsx watch` slow/flaky cold start on Windows | Acceptable; production build boots fast. Optionally tune watch or document |
| 🟡 | Local-disk storage only | S3/GCS adapter (interface already abstracts this) |

## Notes
- Items marked Phase 2 in [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md)
  (portals, marketplace, reminders, OCR, payments) are **not** debt — they are
  scoped-out features and must not be built without an explicit decision.
