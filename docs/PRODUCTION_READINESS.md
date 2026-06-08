# P Profile — Production Readiness Assessment

> Assessment of the Phase 1 foundation for production use. Verdict reflects a
> **pilot/demo-ready** system that needs defined hardening before general
> availability. Cross-refs: [`PHASE1_AUDIT.md`](./PHASE1_AUDIT.md),
> [`TECHNICAL_DEBT.md`](./TECHNICAL_DEBT.md), [`KNOWN_LIMITATIONS.md`](./KNOWN_LIMITATIONS.md).

## Overall verdict
**🟠 Amber — Pilot-ready, not GA-ready.**
- Functionally complete for the Phase 1 core; typechecks, builds, and passes
  runtime + browser validation against real PostgreSQL.
- A production-blocking serving bug was found and fixed during this audit.
- Remaining items before general availability are well-understood and listed below;
  most are operational/security hardening, not redesign.

## Readiness checklist

| Area | State | Blocker for GA? |
|---|---|---|
| Builds (`tsc`, `vite`, `esbuild`) | ✅ clean | — |
| Runtime validation (real PG, all flows) | ✅ pass | — |
| Production SPA serving | ✅ fixed (was broken) | — |
| Schema applied + seed | ✅ | — |
| AuthN (scrypt, httpOnly+secure+sameSite cookie) | ✅ | — |
| AuthZ (RBAC + party scoping, enforced server-side) | ✅ | — |
| Input validation (Zod on all writes) | ✅ | — |
| Public preview privacy (no leak) | ✅ verified | — |
| Security headers | ✅ basic added | — |
| **Session revocation** | ❌ stateless, 7-day TTL | 🟠 recommended |
| **Login rate limiting/lockout** | ❌ | 🟠 recommended |
| **Authenticated document access** | ❌ static `/uploads` | 🟠 recommended |
| **Versioned DB migrations** | ❌ `push` only | 🔴 yes (before real data) |
| **Automated tests + CI** | ❌ none | 🔴 yes |
| **Pagination on lists** | ❌ | 🟠 at scale |
| **Observability (logs/metrics/errors)** | ❌ console only | 🟠 yes |
| **Durable/scalable file storage** | ❌ local disk | 🟠 at scale |
| TLS / HTTPS (cookie `secure` needs it) | ⚠️ deploy-dependent | 🔴 yes in prod |
| Backups (PG + uploads) | ⚠️ ops | 🔴 yes |

## Minimum path to GA
1. **Versioned migrations** (replace `push`) + migrate-on-deploy.
2. **Test suite + CI** (unit: warranty math, permissions, identity; API integration; smoke E2E).
3. **Auth hardening**: session revocation (`tokenVersion`/store), login rate limiting.
4. **Authenticated document download** route (stop serving private files from static `/uploads`).
5. **TLS + backups + basic observability** (error tracking, structured logs).
6. **Pagination** on list endpoints.

## Suitable for now
- Internal pilots, demos, and design partners on a single node behind HTTPS, with
  the demo seed disabled and a strong `SESSION_SECRET`.

## Not yet suitable for
- Multi-node/high-availability deployment, untrusted public scale, or holding
  irreplaceable customer data without the migration + backup + test gates above.
