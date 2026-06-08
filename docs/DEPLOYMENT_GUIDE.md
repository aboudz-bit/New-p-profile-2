# P Profile — Deployment Guide

> Phase 1 foundation. Single Node process serves the API **and** the built SPA on
> one origin/port. PostgreSQL is the only external dependency.

## Stack & requirements
- Node.js 20+ (ESM, `tsx`/`esbuild` toolchain).
- PostgreSQL 14+ (16 verified). `gen_random_uuid()` needs `pgcrypto` (built into PG 13+).
- No other services required in Phase 1 (no Redis/SMS/OCR/object storage).

## Environment variables (`.env`)
| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://user:pass@host:port/db`. Server throws on boot if unset. |
| `SESSION_SECRET` | ✅ in prod | Must be strong (≥16 chars, not the dev default) when `NODE_ENV=production`. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| `PORT` | optional | Default `5000`. |
| `NODE_ENV` | optional | `development` \| `production`. |
| `UPLOAD_DIR` | optional | Local document storage dir (default `./uploads`). |

`.env` is gitignored. Never commit secrets.

## Local development
```bash
npm install
cp .env.example .env            # set DATABASE_URL + SESSION_SECRET
npm run db:push                 # apply schema  (use: npx drizzle-kit push --force in non-interactive shells)
npm run seed                    # optional demo data
npm run dev                     # http://localhost:5000  (API + Vite client)
```
> Note: `drizzle.config.ts` has `strict: true`, so `db:push` prompts for confirmation;
> in CI/non-interactive shells run `npx drizzle-kit push --force`.

## Production build & run
```bash
npm run check                   # typecheck (tsc --noEmit)
npm run build                   # tsc + vite build (→ dist/public) + esbuild server (→ dist/server/index.mjs)
NODE_ENV=production npm run start
```
The production server serves the built client from `dist/public` with SPA
fallback and the API under `/api`. Uploaded files are served from `/uploads`.

## Schema management
- Phase 1 uses `drizzle-kit push` (schema sync, **no versioned migrations**).
  Safe pre-launch; before holding real data, switch to generated migrations
  (`npm run db:generate` + a migrate step) — see [`TECHNICAL_DEBT.md`](./TECHNICAL_DEBT.md).

## Reverse proxy / TLS (recommended for production)
- Terminate TLS at a proxy (nginx/Caddy/cloud LB); forward to the Node `PORT`.
- The session cookie sets `secure` automatically when `NODE_ENV=production`, so
  production **must** be served over HTTPS or the cookie won't be sent.
- `sameSite=lax` is used; keep the SPA and API on the same origin (the default).

## Operational notes
- **Single-node only**: local-disk document storage and in-process session signing
  mean horizontal scaling needs a shared object store + sticky sessions (or move
  to stored sessions). See limitations.
- **Backups**: back up PostgreSQL and the `UPLOAD_DIR` together (documents are on disk).
- **Health check**: `GET /api/health`.
- **Demo data**: never run `npm run seed` against production (creates known demo logins).

## Container sketch (illustrative)
```
# Postgres
docker run --name pprofile-db -e POSTGRES_PASSWORD=... -e POSTGRES_DB=pprofile -p 5432:5432 -d postgres:16
# App: build image that runs `npm ci && npm run build && node dist/server/index.mjs`
# with DATABASE_URL, SESSION_SECRET, NODE_ENV=production, and a mounted UPLOAD_DIR volume.
```
