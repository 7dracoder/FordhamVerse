---
name: SpacetimeDB multiplayer (FordhamVerse)
description: Non-obvious gotchas wiring the SpacetimeDB JS SDK + local standalone server behind a reverse proxy
---

## SDK websocket URL drops base path without a trailing slash
The SDK builds its WS URL with `new URL("v1/database/<name>/subscribe", uri)`. `new URL(relative, base)`
strips the last path segment of `base` unless `base` ends with `/`. So a proxy-prefixed URI like
`https://host/stdb` becomes `https://host/v1/database/...` (prefix lost) and the upgrade misses the
`/stdb` route → silent connect timeout.
**Rule:** always normalize the connection URI to a trailing slash (`.../stdb/`) before `.withUri()`.
**Why:** cost us a long debug; HTTP worked, only WS upgrade failed, because the proxy route only
matches `/stdb*`.

## Local standalone data dir is NOT under the workflow's $HOME
The `spacetime` CLI resolves its data dir to `/home/runner/workspace/.local/share/spacetime/data`
regardless of the workflow's `$HOME` (which is `/home/runner`). Wiping `$HOME/.local/share/spacetime`
does nothing.
**Rule:** wipe the explicit workspace path (`/home/runner/workspace/.local/share/spacetime/data`,
keep the `bin/` subdir to avoid re-downloading the standalone binary).

## Anonymous publish + persisted db = 403 on republish
`spacetime publish --anonymous` mints a fresh identity each run; a previously-created named db is owned
by the old identity, so republish fails `403 ... not authorized ... update database`. The dev-server
script wipes the data dir on start so each boot creates the db fresh (presence is ephemeral anyway).

## Verifying the transport
Headless 2-client check: `artifacts/fordhamverse/scripts/mp-test.mts` (run via `pnpm dlx tsx`, honors
`STDB_URI`). Point it at `http://127.0.0.1:80/stdb/` to exercise the exact shared-proxy path the browser
uses (shared proxy :80 → api-server `/stdb` → spacetime :3000). Node 24 has global WebSocket; no polyfill.
