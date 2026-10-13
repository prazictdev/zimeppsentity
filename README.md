# peclient

Nuxt 4 SPA for Procurement Entity (PE) users on the eGP platform.

Runs alongside `adminclient` and `supplierclient`, sharing the same Laravel API
at `api/`. Authentication uses the **shared** `/api/auth/*` endpoints
(owned by `Modules/Admin`). PE-specific feature endpoints will live under
`/api/pe/*` once that module is built.

## Setup

```bash
npm install
npm run dev      # http://localhost:3002
```

## Configuration

`.env` (copied from supplierclient on scaffold — review before first run):

```
NUXT_PUBLIC_API_BASE=http://localhost:8000
NUXT_PUBLIC_DOCMAN_BASE_URL=http://localhost:8001
NUXT_PUBLIC_DOCMAN_KEY=local-dev-docman-key
```

Sanctum auth endpoints (in `nuxt.config.ts`):

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET  /api/auth/me`
- `POST /api/auth/refresh` (used by `usePeClient` on 401)
- `POST /api/password-resets/{request,reset}`

## Structure

Mirrors `supplierclient/` — same conventions for layouts, pages, stores,
composables, utils. The `usePeClient()` composable wraps Sanctum with auto
401-refresh against `/api/auth/refresh`.

## Notes

Scaffolded 2026-05-05 from `supplierclient/`. Supplier-domain pages,
stores, composables, components and yup schemas were stripped — PE
features will be built up from scratch.
