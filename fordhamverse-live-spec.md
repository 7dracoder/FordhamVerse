# FordhamVerse Live – Full Project Specification

> Build a **production-quality, visually stunning, real-time 3D web app** called **FordhamVerse Live**:  
> A multiplayer campus MMO for Fordham University where students explore a 3D Rose Hill / Lincoln Center map, discover live events, and unlock Replit-powered learning quests guided by an AI Campus TA that understands their codebases via Perseus-style code search.
>
> Tech stack (target):
> - **Frontend:** Vite + React + TypeScript + Tailwind CSS + React Three Fiber (R3F) + @react-three/drei + Framer Motion
> - **Realtime state:** SpacetimeDB (rooms, players, events, portals, quests)
> - **Agent service:** Python (FastAPI) for code analysis + AI hints, integrating with a Perseus-style code search API and an LLM
> - **Hosting / execution:** Designed to run on Replit (frontend + agent service + SpacetimeDB module in one monorepo) and launch Replit projects for quests

The goal is for an AI coding assistant to turn this spec into a complete, working repo, not just scaffolding.

---

## 1. Product Overview

### 1.1 Vision

FordhamVerse Live turns Fordham University’s campuses (Rose Hill in the Bronx and optionally Lincoln Center in Manhattan) into an interactive, 3D multiplayer space.

Students:

- Walk around a **3D Fordham campus** as avatars in the browser.
- See **live events** (study groups, club meetings, pickup games) pinned to real buildings.
- Enter **Learning Portals** at buildings and clubs to launch Replit coding/learning quests.
- Get guidance from an **AI Campus TA** that understands both the quest repo and their own Replit projects via code search.

Hosts/teachers:

- Run live sessions where the main display shows:
  - A **3D campus map** with hotspots for events and learning quests.
  - A **heatmap** of where students are learning and what topics they’re tackling.

### 1.2 Core Problems Solved

1. **Campus events are fragmented** across IG, email, random flyers.
2. **Learning resources are disconnected** from physical context (buildings, clubs, departments).
3. **AI tutors are generic** and rarely grounded in the student’s real codebases.

FordhamVerse bridges these by combining **place**, **people**, and **projects** into one real-time experience.

---

## 2. High-Level Feature Set

### 2.1 Multiplayer 3D Campus

- WebGL-powered 3D rendering of Fordham Rose Hill (MVP) using GLTF models.
- Avatars:
  - Capsule characters with smooth animations and colored rings.
  - Floating nametags rendered with `<Html>` from `@react-three/drei`.
- Camera:
  - Third-person follow cam with smooth damping.
  - Mouse/touch controls for orbit and pan in spectator mode.

### 2.2 Live Events System

- Any logged-in user can create an event:
  - Title, description, start time, building, optional tags.
- Events show as 3D markers near building entrances.
- Proximity triggers:
  - If the avatar enters a radius around an event marker, a sleek sidebar slides in with event details and RSVP buttons.
- RSVP state stored per user; RSVP’d users see a "joined" badge and can enter the event chat.

### 2.3 Learning Portals (Replit Integration)

Each major building has one or more **Learning Portals**:

- CS building → debugging, algorithms, and systems quests.
- Gabelli / business → startup, analytics, and product quests.
- Clubs → quests like "build a site for this club" or "build a discord bot for this org".

Clicking a portal:

- Opens a modal with quest info (difficulty, estimated time, skills).
- "Launch on Replit" button opens a Replit project/template in a new tab.
- FordhamVerse records that the user started this quest and shows an active quest icon above their avatar.

### 2.4 AI Campus TA (Perseus-style Code Context)

The Campus TA is a UI element (floating icon + 3D kiosk + chat drawer) that:

- Knows which Replit quests a student has launched.
- Has access to a Perseus-style code search API over:
  - The quest repo.
  - The student’s relevant public Replit repos.

Students can ask:

- "I’m stuck on the Fordham CS quest, tests are failing—what’s wrong?"
- "Do my projects look more like frontend or data engineering? What should I do next?"

The TA calls the agent service, which:

1. Uses `search_code` to find relevant functions/tests in the quest repo.
2. Optionally searches the student’s repos for similar patterns.
3. Sends snippets + test output + a short explanation prompt to the LLM.
4. Returns:
   - A **short, specific hint**.
   - **Concept tags** (e.g., `"off_by_one"`, `"async"`, `"sql_joins"`).
   - A **recommended next quest** or Replit template.

### 2.5 Learning Heatmap & Analytics

Host mode includes a **heatmap overlay** on the campus:

- Buildings glow based on how many active quests are associated with them.
- Side panel lists:
  - Number of active quests per category (ML, frontend, infra, startup, etc.).
  - Most common concept tags from AI TA responses.

This is highly visual and provides an instant "what is this class/campus working on right now" snapshot.

### 2.6 Social Layer

- Event chats (per event): simple real-time text chat.
- Optional "shout" from organizers that appear as temporary floating banners over buildings.
- Simple achievement badges (e.g., "First quest completed", "CS building regular", etc.).

---

## 3. Tech Stack & Architecture

### 3.1 Frontend

- **Vite + React + TypeScript**
- **Tailwind CSS** for utility-first styling.
- **React Three Fiber + @react-three/drei** for 3D rendering.
- **Framer Motion** for smooth UI animations (sidebars, modals, overlays).

Responsibilities:

- Render 3D campus scene and avatars.
- Maintain camera, input controls, and movement.
- Subscribe to SpacetimeDB for rooms, players, events, portals, and quest state.
- Trigger calls to the agent service for AI TA queries and Replit quest status.

### 3.2 Realtime Backend – SpacetimeDB

- SpacetimeDB is used as the single source of truth for live state:
  - Rooms (sessions), players, avatars.
  - Events and RSVPs.
  - Learning Portals and active quests.
  - Aggregated learning stats.

Clients subscribe to SpacetimeDB tables instead of managing websockets manually.

### 3.3 Agent / Code Analysis Service

- **Language:** Python 3 + FastAPI
- Responsibilities:
  - Integrate with a **Perseus-style code search API** for quest repos and student repos.
  - Integrate with an **LLM API** (abstracted behind environment variables) for reasoning.
  - Evaluate quest repos (run tests, infer whether a quest is "complete").
  - Generate hints and recommendations for the AI Campus TA.

### 3.4 Replit Integration

- FordhamVerse acts as the **hub/launcher**; Replit hosts the actual coding quests.
- Each quest has a `replitTemplateUrl` that is opened when a user launches the quest.
- Optionally, Replit APIs / webhooks can be used to:
  - Check if a user has pushed a solution or passed tests.
  - Sync status back into FordhamVerse.

### 3.5 Repo Layout (Monorepo)

```bash
/fordhamverse-live
  /frontend
    # Vite + React + TS + Tailwind + R3F app
  /agent-service
    # FastAPI app for AI TA and code analysis
  /spacetime-module
    # SpacetimeDB TypeScript module
  /assets
    /models
      fordham_rose_hill.gltf
      # optional: lincoln_center.gltf
    /textures
  README.md
```

---

## 4. Data Model (Conceptual)

### 4.1 Entities

**Room**
- `id: string`
- `name: string`
- `code: string` (short join code)
- `status: "lobby" | "live" | "ended"`
- `createdAt: timestamp`

**Player**
- `id: string`
- `roomId: string`
- `displayName: string`
- `avatarColor: string`
- `position: { x: number; y: number; z: number }`
- `rotationY: number`
- `activeQuestId: string | null`
- `connected: boolean`

**Event**
- `id: string`
- `roomId: string`
- `creatorPlayerId: string`
- `title: string`
- `description: string`
- `buildingId: string`
- `position: { x: number; y: number; z: number }`
- `startTime: timestamp`
- `endTime: timestamp | null`
- `tags: string[]`

**EventRsvp**
- `id: string`
- `eventId: string`
- `playerId: string`
- `status: "going" | "interested"`

**Building**
- `id: string`
- `name: string`
- `position: { x: number; y: number; z: number }`
- `campus: "rose_hill" | "lincoln_center"`

**LearningPortal**
- `id: string`
- `buildingId: string`
- `title: string`
- `description: string`
- `category: "ml" | "frontend" | "infra" | "startup" | "data" | "general"`
- `replitTemplateUrl: string`
- `estimatedMinutes: number`

**PlayerQuest**
- `id: string`
- `playerId: string`
- `portalId: string`
- `status: "not_started" | "in_progress" | "completed"`
- `startedAt: timestamp | null`
- `completedAt: timestamp | null`
- `lastStatusCheckAt: timestamp | null`

**LearningStats** (derived table or materialized view)
- `id: string`
- `roomId: string`
- `campus: string`
- `buildingId: string`
- `activeQuestCount: number`
- `completedQuestCount: number`
- `conceptTagCounts: { [tag: string]: number }`

---

## 5. SpacetimeDB Module Specification

Implement a **TypeScript module** for SpacetimeDB with tables and reducers.

### 5.1 Tables

- `rooms` (Room)
- `players` (Player)
- `events` (Event)
- `event_rsvps` (EventRsvp)
- `buildings` (Building)
- `learning_portals` (LearningPortal)
- `player_quests` (PlayerQuest)

### 5.2 Reducers

Reducers should be deterministic, validate inputs, and enforce room status.

1. `create_room(name: string) -> Room`
   - Creates a room and generates a short `code`.

2. `join_room(code: string, displayName: string) -> Player`
   - Find room by code; create player; assign random avatar color; set default position.

3. `update_player_pose(playerId: string, position: Vec3, rotationY: number)`
   - Update player pose if connected, throttled on client-side.

4. `create_event(roomId: string, creatorPlayerId: string, title: string, description: string, buildingId: string, tags: string[]) -> Event`
   - Compute event position near building.
   - Set default startTime to now; endTime null.

5. `rsvp_event(eventId: string, playerId: string, status: "going" | "interested") -> EventRsvp`
   - Upsert RSVP.

6. `launch_portal(playerId: string, portalId: string) -> PlayerQuest`
   - Create or update `PlayerQuest` as `in_progress` with `startedAt`.
   - Set `Player.activeQuestId`.

7. `complete_quest(playerQuestId: string)`
   - Mark `PlayerQuest.status = "completed"` and set `completedAt`.

8. `update_connection(playerId: string, connected: boolean)`
   - Mark player connection status.

### 5.3 Subscriptions

Provide subscription queries for the frontend:

- `sub_room(roomId)` – returns room metadata.
- `sub_players(roomId)` – live list of players and pose.
- `sub_events(roomId)` – events and RSVPs.
- `sub_portals(roomId)` – buildings + learning portals.
- `sub_player_quests(playerId)` – active/completed quests for a player.
- `sub_learning_stats(roomId)` – aggregated stats per building/portal.

---

## 6. Agent / AI Service Specification (FastAPI)

### 6.1 Endpoints

Base URL: `/api`

1. `POST /quest/status`
   - **Input:**
     - `playerId`
     - `portalId`
     - `replitProjectUrl` (optional override)
   - **Purpose:**
     - Check if the student appears to have completed the quest.
   - **Process (MVP):**
     - Use heuristics: e.g., call Replit API or require user to paste test output.
   - **Output:**
     - `status: "not_started" | "in_progress" | "completed"`

2. `POST /ta/hint`
   - **Input:**
     - `playerId`
     - `portalId`
     - `question: string`
     - Optional: `codeSnapshot`, `testOutput`
   - **Process:**
     - Use Perseus-style API:
       - `search_code` in quest repo for relevant files.
       - Optionally search player’s public repos.
       - Call `get_snippet` to return small code snippets and relevant tests.
     - Build a structured prompt for LLM:
       - Include question, snippets, test failures.
       - Ask for a short, concrete hint + concept tags + optional recommended next quest.
   - **Output:**
     - `hint: string`
     - `conceptTags: string[]`
     - `nextPortalId: string | null`

3. `POST /ta/profile-summary`
   - **Input:**
     - `playerId`
   - **Process:**
     - Use Perseus-style code search over player’s known Replit repos.
     - Cluster by libraries/patterns (e.g., `react`, `pandas`, `fastapi`, `docker`).
     - Call LLM to summarize:
       - Strengths, weak areas.
       - 2–3 recommended categories of portals.
   - **Output:**
     - `summary: string`
     - `recommendedCategories: string[]`


### 6.2 Implementation Notes

- Use `pydantic` models for request/response.
- Encapsulate LLM calls in a dedicated client with environment variables.
- Encapsulate code-search calls in a `perseus_client.py` with methods `search_code` and `get_snippet`.
- For MVP where Perseus is not available, provide stub implementations that log and return placeholder snippets.

---

## 7. Frontend UI/UX Details

### 7.1 Visual Style

- **Core aesthetic:**
  - Dark, premium, minimal (inspired by Vercel/Linear).
  - Campus scene has a slightly desaturated palette; UI overlays use glassmorphism.
- **Tailwind theming:**

```ts
// tailwind.config.ts
extend: {
  colors: {
    bg: "#020617",
    surface: "#020617",
    surfaceAlt: "#020617",
    accent: "#22c55e",
    accentSoft: "#16a34a",
    borderSubtle: "#1e293b",
    textPrimary: "#e5e7eb",
    textSecondary: "#9ca3af",
  },
}
```

- **Components:**
  - Glass cards with `bg-surface/80 backdrop-blur-xl border border-borderSubtle`.
  - Accent glow on active portals/events.
  - Framer Motion for smooth slide-in of sidebars and modals.

### 7.2 Screens

#### 7.2.1 Landing / Room Join

- Left side: FordhamVerse branding and a short tagline.
- Right side: Join form:
  - `Room code` input.
  - `Display name` input.
  - Button: "Enter FordhamVerse".
- On submit:
  - Call SpacetimeDB `join_room`.
  - Navigate to main `CampusView`.

#### 7.2.2 Campus View (Player)

Layout:

- Fullscreen WebGL canvas as background.
- Top bar:
  - Room code, campus toggle (Rose Hill / Lincoln), connection indicator.
- Bottom center:
  - Minimal movement hints/help.
- Right side:
  - Collapsible sidebar for "Events" and "Learning" tabs.
  - Events tab: list active events; clicking focuses camera on event.
  - Learning tab: list available portals near you and recommended quests.
- Bottom right:
  - AI Campus TA button (floating icon). Clicking opens a chat drawer.

#### 7.2.3 Host/Instructor View

- Same 3D scene plus overlays:
  - **Learning Heatmap toggle** – overlays color-coded building glows based on active quests.
  - **Stats panel** – number of active quests by category, recent concept tags.
  - **Events panel** – live events summary.

---

## 8. 3D & Multiplayer Implementation Notes

### 8.1 3D Campus

- Use Blender + open map data to create a simplified Fordham campus GLTF.
- Optimize:
  - Geometry decimation.
  - Shared materials.
  - Light baking or simple lighting in R3F for performance.

### 8.2 Movement & Interpolation

- Use `useFrame` in R3F to:
  - Handle local movement (WASD / arrows + space for jump).
  - Apply physics-lite constraints (e.g., basic ground collision, no falling through map).
- Client sends pose updates at a throttled rate (e.g., 10–15 Hz) only while moving.
- Remote players’ positions are interpolated (lerped) on the client to smooth network jitter.

### 8.3 Proximity Detection

- Each frame, compute distance between player and:
  - Events.
  - Portals.
- If distance < threshold:
  - Trigger UI overlays (event card or portal card).

---

## 9. Hackathon Demo Script (2 Minutes)

1. **Intro (0:00–0:20)**
   - "This is FordhamVerse Live – an MMO layer over the Fordham campus where you can find events and discover learning quests on Replit, guided by an AI Campus TA that understands your code."

2. **Join & flyover (0:20–0:40)**
   - Scan QR / click link; a couple of judges join as avatars.
   - Show them moving on Rose Hill campus with nametags.

3. **Events & social (0:40–1:00)**
   - Drop a quick event at the library (e.g., "Study sprint now").
   - Walk your avatar near it; event sidebar pops open.

4. **Learning portal (1:00–1:30)**
   - Walk to the CS building; a glowing portal activates.
   - Click it → portal modal with a Replit debugging quest.
   - Click "Launch on Replit" (show new tab briefly) and mark the quest `in_progress` in FordhamVerse.

5. **AI Campus TA (1:30–1:50)**
   - Open TA chat: "I’m stuck on the binary search quest. Tests 3 and 4 are failing." 
   - TA returns a short, specific hint referencing code/tests and suggests another portal.

6. **Heatmap & closing line (1:50–2:00)**
   - Switch to host view; toggle heatmap to show where learning is happening.
   - "We turned the Fordham campus itself into a multiplayer learning game – events, quests, and an AI TA that actually reads your code."

---

## 10. Implementation Plan for an AI Coding Assistant

When implementing this project from the spec:

1. **Create monorepo structure** with `/frontend`, `/agent-service`, `/spacetime-module`, and `/assets`.
2. **Scaffold frontend** with Vite + React + TS + Tailwind + R3F + Framer Motion.
3. **Implement SpacetimeDB module**:
   - Tables and reducers from section 5.
   - Basic seed data for buildings and portals.
4. **Integrate frontend with SpacetimeDB** subscriptions for room, players, events, and portals.
5. **Implement AI agent service**:
   - Stub endpoints `/ta/hint` and `/ta/profile-summary` that accept inputs and return mocked hints.
   - Abstract Perseus/LLM calls for later.
6. **Wire Replit quest launch** with static template URLs for initial demo.
7. **Add heatmap and stats panels** using data from `player_quests` and concept tags.
8. **Polish UI** with Tailwind + Framer Motion for a clean, minimal, responsive design suitable for a projector demo.

End of specification.
