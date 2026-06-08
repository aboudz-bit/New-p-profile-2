# P Profile — RBAC Matrix

> Source of truth for permissions: [`shared/permissions.ts`](../shared/permissions.ts).
> Enforced server-side by `requirePermission()` ([`server/lib/auth.ts`](../server/lib/auth.ts));
> mirrored on the client via `useAuth().can()` for UX only (never trusted).
> Aligned with [`PRODUCT_PROFILE_DESIGN.md`](./PRODUCT_PROFILE_DESIGN.md) §7.

## Two enforcement layers

1. **Intra-actor RBAC (this document)** — the 5 roles inside a single party
   (business or consumer). Governs what a party's own users may do on the
   profiles that party is associated with.
2. **Per-profile access (scoping)** — every tenant-scoped query is filtered by the
   acting party (`req.partyId`), and profile access is gated by an **active
   `owner` association**. In Phase 1 cross-actor access is limited to directory
   service-center linking and the warranty `shareableWithProvider` flag; broader
   association-scope/share-grant enforcement is Phase 2.

## Roles

| Role | Intent |
|------|--------|
| `owner` | Party creator. Full control incl. org/billing settings. |
| `admin` | Manage everything within the party except org settings. |
| `manager` | Manage profiles, warranties, service, directory, documents. |
| `technician` | Record service history + upload documents. |
| `viewer` | Read-only (profiles + service history). |

> A consumer (personal) account is created with a single `owner` user and no
> branches. The same role enum applies; in practice a consumer is always `owner`
> of their own party.

## Permission matrix

| Permission | owner | admin | manager | technician | viewer |
|------------|:---:|:---:|:---:|:---:|:---:|
| `org:manage` | ✅ | — | — | — | — |
| `branch:manage` | ✅ | ✅ | — | — | — |
| `user:manage` | ✅ | ✅ | — | — | — |
| `profile:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `profile:write` | ✅ | ✅ | ✅ | — | — |
| `warranty:write` | ✅ | ✅ | ✅ | — | — |
| `maintenance:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `maintenance:write` | ✅ | ✅ | ✅ | ✅ | — |
| `directory:write` | ✅ | ✅ | ✅ | — | — |
| `document:write` | ✅ | ✅ | ✅ | ✅ | — |

## Permission → endpoint map

| Permission | Guards |
|------------|--------|
| `profile:write` | `POST/PATCH/DELETE /api/profiles`, `POST /api/profiles/claim`, `PUT /api/profiles/:id/service-centers` |
| `warranty:write` | `POST/PATCH/DELETE /api/warranties` |
| `maintenance:read` | `GET /api/maintenance` |
| `maintenance:write` | `POST/PATCH/DELETE /api/maintenance` |
| `document:write` | `POST/DELETE /api/documents` |
| `directory:write` | `POST/PATCH/DELETE /api/directory` |
| `branch:manage` | `POST/PATCH/DELETE /api/branches` |
| `user:manage` | `GET/POST/PATCH /api/users` |
| `org:manage` | (reserved — no endpoint yet; org-settings management is future work) |

Reads not in the table (`GET /api/profiles`, `/api/profiles/:id`, `/api/branches`,
`/api/directory`, `/api/dashboard/stats`) require authentication only; every role
holds `profile:read`/`maintenance:read`, and results are always party-scoped.

## Special rules

- **Owner creation/promotion:** only an existing `owner` may create or promote a
  user to `owner` ([`users.routes.ts`](../server/routes/users.routes.ts)).
- **Primary branch:** UI prevents deleting the primary branch; the server allows
  branch delete by permission (a primary-branch server guard is recommended — see
  [`TECHNICAL_DEBT.md`](./TECHNICAL_DEBT.md)).
- **Business-only nav:** Branches and Users pages are hidden for consumer parties
  client-side; the endpoints still require `branch:manage`/`user:manage`.
