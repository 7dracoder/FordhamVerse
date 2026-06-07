---
name: SpacetimeDB Maincloud publish
description: fordhamverse module is live on Maincloud; re-publish steps and token gotcha.
---

## State
- Module `fordhamverse` published to Maincloud. Dashboard: https://spacetimedb.com/fordhamverse
- No extra env vars needed for the deployed app — `resolveStdbUri()` in store.ts returns `https://maincloud.spacetimedb.com` when `import.meta.env.DEV` is false.
- Module name (`fordhamverse`) matches `VITE_STDB_MODULE` default.

## Re-publish after module changes
```bash
export PATH="$HOME/.local/bin:$PATH"
spacetime login          # browser flow; stores JWT in config dir
cd spacetimedb
spacetime publish -s maincloud --yes fordhamverse
```

## Token gotcha
`spacetime login --token <value>` requires a **JWT** (starts with `eyJ…`), not a hex identity string. If the user provides a 64-char hex value, it's their identity — `spacetime login show` will error "does not look like a JSON web token". Fix: run `spacetime login` (browser flow) in the Replit Shell instead.

**Why:** SpacetimeDB Maincloud auth uses JWTs as bearer tokens. The hex identity is display-only.
