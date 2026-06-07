# FordhamVerse Live Features

FordhamVerse Live is a real-time 3D campus MMO for Fordham students. It turns Rose Hill and Lincoln Center into an interactive browser world where students can move as avatars, discover live events, launch Replit learning quests, and ask an AI Campus TA for code-aware help.

## What It Does

- Renders a 3D Fordham campus scene in the browser.
- Lets students join a shared room with a short room code.
- Shows each user as a moving avatar with a floating nametag.
- Supports WASD movement, sprinting, jumping, and third-person camera follow.
- Shows other connected players in real time.
- Displays live campus events as 3D markers near buildings.
- Opens event details when a player walks near or clicks an event marker.
- Lets users RSVP as `going` or `interested`.
- Lets users create new campus events with title, description, building, and tags.
- Adds Learning Portals to campus buildings.
- Opens quest modals with difficulty, skills, estimated time, and description.
- Launches Replit templates for quests in a new tab.
- Tracks active and completed player quests.
- Shows an active quest icon over a player's avatar.
- Provides a host/instructor mode.
- Shows a learning heatmap by glowing buildings with active quests.
- Shows live learning stats by category.
- Includes an AI Campus TA chat drawer for quest help.
- Sends TA questions to a FastAPI agent service.
- Returns short code-aware hints, concept tags, and recommended next quests.
- Supports a local zero-setup realtime adapter for demos.
- Supports real SpacetimeDB live subscriptions and reducers when configured.

## Main Screens

### Landing / Join

- FordhamVerse branding and campus tagline.
- Room code input.
- Display name input.
- Default demo room: `RAMS`.
- Connects the player to the campus view.

### Campus View

- Fullscreen WebGL 3D scene.
- Top bar with room status, campus toggle, connection state, and view mode.
- Sidebar with Events and Learning tabs.
- Proximity cards for nearby events and portals.
- Bottom movement hints.
- Floating AI Campus TA button.

### Host View

- Switches from player-follow camera to orbit controls.
- Enables instructor-style observation.
- Adds learning heatmap overlay.
- Shows active quest counts, live event counts, category totals, and recent concept tags.

## 3D Campus Features

- Procedural Rose Hill-inspired campus model.
- Lincoln Center campus toggle with its own portal.
- Fordham-styled buildings, paths, trees, fountain, lighting, fog, and sky.
- Building labels rendered in world space.
- Portal rings with glow effects.
- Event markers with pulsing visual treatment.
- Avatar bodies with colored rings and quest indicators.
- Smooth interpolation for remote players.
- Camera smoothing for third-person movement.

## Events System

- Events contain:
  - `title`
  - `description`
  - `buildingId`
  - `position`
  - `startTime`
  - `tags`
- Users can create events from the sidebar.
- Events appear in the 3D world and in the event list.
- Users can RSVP.
- RSVP state is stored per player.

## Learning Portal System

Learning portals connect Fordham buildings to Replit-based quests:

- Keating Hall: Systems Debugging Sprint.
- Walsh Library: Live Events Frontend.
- Gabelli School of Business: Campus Analytics Lab.
- McGinley Center: Ship a Campus Startup.
- Lowenstein Center: Creative Code Studio.

Each portal includes:

- Quest title.
- Description.
- Category.
- Difficulty.
- Skills.
- Estimated time.
- Replit template URL.

## AI Campus TA

The AI Campus TA provides short, specific help for quest work.

It supports:

- `POST /api/ta/hint`
- `POST /api/ta/profile-summary`
- `POST /api/quest/status`
- `GET /api/health`

The service includes:

- FastAPI app.
- Pydantic request and response models.
- Perseus-style code search adapter.
- LLM abstraction.
- Offline deterministic fallback hints.
- Concept tag extraction.
- Recommended next portal IDs.
- Quest status heuristics from test output.

Example TA output:

- Hint about binary search loop bounds.
- Tags like `binary_search`, `off_by_one`, `loop_invariant`.
- Next portal recommendation.

## Realtime / SpacetimeDB

The project has two realtime modes.

### Local Demo Adapter

- Works without any database server.
- Uses browser storage and broadcast channels.
- Mirrors the SpacetimeDB reducer API.
- Good for demos and development.

### Real SpacetimeDB Module

The `spacetime-module` package is a deployable SpacetimeDB 2.4 TypeScript module.

It includes tables for:

- `rooms`
- `players`
- `events`
- `event_rsvps`
- `buildings`
- `learning_portals`
- `player_quests`
- `learning_stats`

It includes reducers for:

- `create_room`
- `set_room_status`
- `join_room`
- `update_player_pose`
- `create_event`
- `rsvp_event`
- `launch_portal`
- `complete_quest`
- `update_connection`
- `record_concept_tags`

It includes lifecycle hooks for:

- Initial seed data.
- Player reconnect handling.
- Player disconnect handling.

It also generates typed frontend bindings in:

```text
frontend/src/module_bindings
```

## Data Tracked

FordhamVerse tracks:

- Room metadata.
- Player identity and pose.
- Avatar colors.
- Connection status.
- Live events.
- Event RSVPs.
- Buildings.
- Learning portals.
- Player quest status.
- Active quests per building.
- Completed quests per building.
- Category counts.
- Concept tag counts.

## Tech Stack

### Frontend

- Vite.
- React.
- TypeScript.
- Tailwind CSS.
- React Three Fiber.
- `@react-three/drei`.
- Three.js.
- Framer Motion.
- Generated SpacetimeDB TypeScript bindings.

### Agent Service

- Python 3.
- FastAPI.
- Pydantic.
- Uvicorn.
- Pytest.
- HTTPX.

### Realtime Module

- SpacetimeDB 2.4.
- TypeScript module SDK.
- Generated client bindings.
- Reducer core tests with Vitest.

## Verification Already Built In

The repo supports:

```bash
npm run build
npm run typecheck
npm run test
npm audit
```

The test suite verifies:

- Spacetime reducer-core behavior.
- Room join and player pose updates.
- RSVP upsert behavior.
- Learning stats aggregation.
- Agent health endpoint.
- TA hint endpoint.
- Quest status endpoint.

## Local Run

```bash
npm install
python3 -m venv agent-service/.venv
agent-service/.venv/bin/python -m pip install -r agent-service/requirements.txt
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Agent API:

```text
http://localhost:8000/api/health
```

Demo room code:

```text
RAMS
```

## Real SpacetimeDB Run

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

With both variables present, the frontend uses live SpacetimeDB subscriptions and reducers. If the database is unavailable, the app falls back to local demo mode.

## Demo Flow

1. Join room `RAMS`.
2. Move around Rose Hill as an avatar.
3. Walk near an event marker and RSVP.
4. Open a Learning Portal.
5. Launch a Replit quest.
6. Ask the AI Campus TA for help.
7. Switch to Host View.
8. Toggle the heatmap and show learning activity.

## Current Scope

This repo is a complete working demo and production-ready foundation. It includes the full frontend, AI service, realtime data model, SpacetimeDB module, generated bindings, docs, and tests. Real GLTF campus assets, external LLM credentials, Perseus production API wiring, and Replit webhooks can be added later without changing the core architecture.
