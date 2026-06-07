# FordhamVerse Live

Production-ready demo monorepo for the FordhamVerse Live specification.

Full feature reference: [FEATURES.md](FEATURES.md)

## What is included

- `frontend`: Vite, React, TypeScript, Tailwind, React Three Fiber, Drei, and Framer Motion.
- `agent-service`: FastAPI service with AI TA, profile summary, quest status, LLM, and Perseus-style code search abstractions.
- `spacetime-module`: Deployable SpacetimeDB 2.4 TypeScript module with tables, reducers, lifecycle hooks, seed data, stats aggregation, and client subscription docs.
- `assets`: model and texture placeholders for Fordham campus assets.

## Run locally

```bash
npm install
python3 -m venv agent-service/.venv
agent-service/.venv/bin/python -m pip install -r agent-service/requirements.txt
npm run dev
```

Frontend: <http://localhost:5173>  
Agent API: <http://localhost:8000/api/health>

Default room code: `RAMS`

The frontend defaults to its built-in realtime adapter, so the demo starts with no external database. To run the real SpacetimeDB backend:

```bash
spacetime start
npm run publish:local -w spacetime-module
npm run generate:client -w spacetime-module
```

Then set:

```bash
VITE_SPACETIMEDB_URI=ws://127.0.0.1:3000
VITE_SPACETIMEDB_DATABASE=fordhamverse-live
```

With both variables present, the frontend uses generated bindings, live subscriptions, and reducers. If connection fails, it falls back to the local demo adapter.

## Verify

```bash
npm run build
npm run test
```

## Notes

The frontend uses a local deterministic realtime adapter by default, so the projector demo remains zero-setup. The deployable SpacetimeDB module exposes the same room, player, event, RSVP, portal, quest, connection, and learning-stat operations for production integration.
