# RM Coin Miner

RM Coin Miner is a Telegram Mini App for running a virtual mining rig, with a temporary development-only direct-browser preview session.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/rm-coin run dev` — run the RM Coin web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/rm-coin/src/App.tsx` — dashboard, miner, upgrade, and authentication gate
- `artifacts/api-server/src/routes/rm-coin.ts` — Telegram and development preview session routes
- `artifacts/api-server/src/middlewares/auth.ts` — signed session cookies and Telegram `initData` validation
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/rm-coin.ts` — RM Coin PostgreSQL schema

## Architecture decisions

- Telegram authentication remains signature-validated and production-safe.
- Direct browser access uses a fixed development preview account only when `NODE_ENV` is not `production`.
- Both Telegram and browser preview sessions use the same HttpOnly signed application cookie and server-backed miner flows.
- API clients and server validators are generated from the OpenAPI contract.

## Product

- Overview of balance, miner energy, stored output, and recent activity
- Miner controls for claiming output and watching a Monetag reward ad
- Progression screen for purchasing miner upgrades
- Telegram `/start` webhook and Mini App support

## User preferences

- Keep direct browser access available for development inspection for now.
- Do not show a Telegram login screen during browser preview.

## Gotchas

- The browser preview session is intentionally disabled in production; restore Telegram-only access by leaving that guard in place.
- After changing `lib/api-spec/openapi.yaml`, run the API codegen command before using updated client hooks or Zod schemas.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
