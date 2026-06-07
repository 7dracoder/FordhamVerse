# FordhamVerse Live

A 3D campus game for Fordham Rose Hill where players explore, join live events, and complete quests — with real-time multiplayer so people who join the same room code (default `RAMS`, shareable via QR) see each other move.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (also reverse-proxies `/stdb` → local SpacetimeDB)
- `pnpm --filter @workspace/fordhamverse run dev` — run the game (Vite)
- The `SpacetimeDB Server` workflow runs `bash spacetimedb/dev-server.sh` — wipes its data dir, starts the local standalone server on `:3000`, and publishes the `fordhamverse` module
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Verify multiplayer transport: `STDB_URI="http://127.0.0.1:80/stdb/" pnpm dlx tsx artifacts/fordhamverse/scripts/mp-test.mts` (headless 2-client join/move/leave check)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env (client): `VITE_STDB_URI`, `VITE_STDB_MODULE` (default module `fordhamverse`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/fordhamverse/` — the game (React + Vite + react-three-fiber)
  - `src/lib/store.ts` — multiplayer store: SpacetimeDB connection, room join, remote-player sync, single-player fallback
  - `src/module_bindings/` — generated SpacetimeDB client bindings (import the `spacetimedb` package)
  - `src/components/CampusScene.tsx` — renders local + remote players; throttled movement sync
  - `scripts/mp-test.mts` — headless 2-client multiplayer transport test
- `spacetimedb/` — the SpacetimeDB module (NOT a pnpm workspace package; own npm deps)
  - `src/index.ts` — `player` table + `enterGame` / `updateTransform` / `leaveGame` reducers + disconnect cleanup
  - `dev-server.sh` — self-healing local server launcher (wipe → start → publish)
- `artifacts/api-server/src/app.ts` — `/stdb` HTTP proxy + `handleStdbUpgrade` WS proxy to local SpacetimeDB

## Architecture decisions

- **Multiplayer = SpacetimeDB.** Self is locally authoritative; remote players are upserted from row callbacks. Movement updates are throttled (~100ms) via `updateTransform`. On connect error/timeout the client falls back to single-player so the game always loads.
- **Dev connects through a reverse proxy.** The browser SDK hits `<origin>/stdb/`; the shared Replit proxy routes `/stdb` to the api-server, which strips the prefix and forwards HTTP + WS upgrades to the local standalone server on `:3000`. Prod connects to SpacetimeDB Maincloud directly.
- **The `/stdb` URI must end in a trailing slash** — the SDK builds its WS URL with `new URL("v1/database/...", uri)`, which silently drops the last path segment without the slash. `resolveStdbUri()` enforces this.
- **Dev server wipes its data dir on every start.** Anonymous publishes mint a fresh identity each run, so a persisted db would 403 on republish; presence is ephemeral anyway.

## Product

- 3D explorable Fordham Rose Hill campus with live events, quests, and an AI Campus TA panel.
- Real-time multiplayer: players entering the same room code (default `RAMS`, shareable via QR) see each other move live.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The local SpacetimeDB data dir is `/home/runner/workspace/.local/share/spacetime/data` — it does **not** follow the workflow's `$HOME`. `dev-server.sh` wipes that explicit path.
- After changing the SpacetimeDB module (`spacetimedb/src/index.ts`), restart the `SpacetimeDB Server` workflow to republish, and regenerate client bindings if the schema changed.
- Production multiplayer requires publishing the module to SpacetimeDB Maincloud (needs the owner's `spacetime login` token); until then a deployed build falls back to single-player.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
