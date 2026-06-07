import { schema, SenderError, table, t } from "spacetimedb/server";

const vec3 = t.object("Vec3", {
  x: t.f32(),
  y: t.f32(),
  z: t.f32(),
});

const rooms = table(
  { name: "rooms", public: true },
  {
    id: t.string().primaryKey(),
    name: t.string(),
    code: t.string().unique(),
    status: t.string(),
    createdAt: t.timestamp(),
  },
);

const players = table(
  {
    name: "players",
    public: true,
    indexes: [
      { accessor: "by_room", algorithm: "btree", columns: ["roomId"] },
      { accessor: "by_owner", algorithm: "btree", columns: ["owner"] },
    ],
  },
  {
    id: t.string().primaryKey(),
    owner: t.identity(),
    roomId: t.string(),
    displayName: t.string(),
    avatarColor: t.string(),
    position: vec3,
    rotationY: t.f32(),
    activeQuestId: t.option(t.string()),
    connected: t.bool(),
    updatedAt: t.timestamp(),
  },
);

const events = table(
  {
    name: "events",
    public: true,
    indexes: [
      { accessor: "by_room", algorithm: "btree", columns: ["roomId"] },
      { accessor: "by_building", algorithm: "btree", columns: ["buildingId"] },
    ],
  },
  {
    id: t.string().primaryKey(),
    roomId: t.string(),
    creatorPlayerId: t.string(),
    title: t.string(),
    description: t.string(),
    buildingId: t.string(),
    position: vec3,
    startTime: t.timestamp(),
    endTime: t.option(t.timestamp()),
    tags: t.array(t.string()),
  },
);

const eventRsvps = table(
  {
    name: "event_rsvps",
    public: true,
    indexes: [
      { accessor: "by_event", algorithm: "btree", columns: ["eventId"] },
      { accessor: "by_player", algorithm: "btree", columns: ["playerId"] },
    ],
  },
  {
    id: t.string().primaryKey(),
    eventId: t.string(),
    playerId: t.string(),
    status: t.string(),
  },
);

const buildings = table(
  { name: "buildings", public: true },
  {
    id: t.string().primaryKey(),
    name: t.string(),
    position: vec3,
    campus: t.string(),
  },
);

const learningPortals = table(
  {
    name: "learning_portals",
    public: true,
    indexes: [{ accessor: "by_building", algorithm: "btree", columns: ["buildingId"] }],
  },
  {
    id: t.string().primaryKey(),
    buildingId: t.string(),
    title: t.string(),
    description: t.string(),
    category: t.string(),
    replitTemplateUrl: t.string(),
    estimatedMinutes: t.u32(),
    skills: t.array(t.string()),
  },
);

const playerQuests = table(
  {
    name: "player_quests",
    public: true,
    indexes: [
      { accessor: "by_player", algorithm: "btree", columns: ["playerId"] },
      { accessor: "by_portal", algorithm: "btree", columns: ["portalId"] },
    ],
  },
  {
    id: t.string().primaryKey(),
    playerId: t.string(),
    portalId: t.string(),
    status: t.string(),
    startedAt: t.option(t.timestamp()),
    completedAt: t.option(t.timestamp()),
    lastStatusCheckAt: t.option(t.timestamp()),
  },
);

const learningStats = table(
  {
    name: "learning_stats",
    public: true,
    indexes: [{ accessor: "by_room", algorithm: "btree", columns: ["roomId"] }],
  },
  {
    id: t.string().primaryKey(),
    roomId: t.string(),
    campus: t.string(),
    buildingId: t.string(),
    activeQuestCount: t.u32(),
    completedQuestCount: t.u32(),
    categoryCountsJson: t.string(),
    conceptTagCountsJson: t.string(),
    updatedAt: t.timestamp(),
  },
);

const spacetimedb = schema({
  rooms,
  players,
  events,
  eventRsvps,
  buildings,
  learningPortals,
  playerQuests,
  learningStats,
});

export default spacetimedb;

const AVATAR_COLORS = ["#22c55e", "#38bdf8", "#f97316", "#a78bfa", "#f43f5e", "#facc15"];
const ROOM_STATUSES = new Set(["lobby", "live", "ended"]);
const RSVP_STATUSES = new Set(["going", "interested"]);

const BUILDING_SEEDS = [
  { id: "building-keating", name: "Keating Hall", position: { x: 0, y: 0, z: -7 }, campus: "rose_hill" },
  { id: "building-walsh", name: "Walsh Library", position: { x: -8, y: 0, z: 0 }, campus: "rose_hill" },
  { id: "building-gabelli", name: "Gabelli School of Business", position: { x: 8, y: 0, z: 1 }, campus: "rose_hill" },
  { id: "building-mcginnley", name: "McGinley Center", position: { x: 2.5, y: 0, z: 8 }, campus: "rose_hill" },
  { id: "building-lincoln", name: "Lowenstein Center", position: { x: 0, y: 0, z: 0 }, campus: "lincoln_center" },
];

const PORTAL_SEEDS = [
  {
    id: "portal-systems-debugging",
    buildingId: "building-keating",
    title: "Systems Debugging Sprint",
    description: "Repair a binary-search service, pass edge-case tests, and explain the invariant.",
    category: "infra",
    replitTemplateUrl: "https://replit.com/new/python3",
    estimatedMinutes: 25,
    skills: ["Python", "testing", "algorithms"],
  },
  {
    id: "portal-frontend-events",
    buildingId: "building-walsh",
    title: "Live Events Frontend",
    description: "Build a responsive event board with filters and optimistic RSVP state.",
    category: "frontend",
    replitTemplateUrl: "https://replit.com/new/react-ts",
    estimatedMinutes: 35,
    skills: ["React", "TypeScript", "UX"],
  },
  {
    id: "portal-data-analytics",
    buildingId: "building-gabelli",
    title: "Campus Analytics Lab",
    description: "Explore student activity data and produce a decision-ready dashboard.",
    category: "data",
    replitTemplateUrl: "https://replit.com/new/python3",
    estimatedMinutes: 40,
    skills: ["SQL", "pandas", "analytics"],
  },
  {
    id: "portal-startup-pitch",
    buildingId: "building-mcginnley",
    title: "Ship a Campus Startup",
    description: "Turn a campus pain point into a tiny product and testable pitch.",
    category: "startup",
    replitTemplateUrl: "https://replit.com/new/html",
    estimatedMinutes: 30,
    skills: ["product", "design", "validation"],
  },
  {
    id: "portal-lincoln-creative-code",
    buildingId: "building-lincoln",
    title: "Creative Code Studio",
    description: "Build an interactive story with motion and public campus data.",
    category: "frontend",
    replitTemplateUrl: "https://replit.com/new/react-ts",
    estimatedMinutes: 45,
    skills: ["React", "motion", "storytelling"],
  },
];

function cleanText(value: string, field: string, maxLength: number): string {
  const cleaned = value.trim();
  if (!cleaned) throw new SenderError(`${field} is required`);
  if (cleaned.length > maxLength) throw new SenderError(`${field} exceeds ${maxLength} characters`);
  return cleaned;
}

function makeId(ctx: any, prefix: string): string {
  const time = ctx.timestamp.microsSinceUnixEpoch.toString(36);
  const entropy = Math.floor(ctx.random() * 0xffffff).toString(36).padStart(5, "0");
  return `${prefix}-${time}-${entropy}`;
}

function uniqueRoomCode(ctx: any, name: string): string {
  const prefix = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2).padEnd(2, "X");
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const suffix = Math.floor(ctx.random() * 1296).toString(36).toUpperCase().padStart(2, "0");
    const code = `${prefix}${suffix}`;
    if (!ctx.db.rooms.code.find(code)) return code;
  }
  throw new SenderError("could not generate room code");
}

function requireRoom(ctx: any, roomId: string): any {
  const room = ctx.db.rooms.id.find(roomId);
  if (!room) throw new SenderError("room not found");
  return room;
}

function requireOpenRoom(ctx: any, roomId: string): any {
  const room = requireRoom(ctx, roomId);
  if (room.status === "ended") throw new SenderError("room has ended");
  return room;
}

function requireOwnedPlayer(ctx: any, playerId: string): any {
  const player = ctx.db.players.id.find(playerId);
  if (!player) throw new SenderError("player not found");
  if (!player.owner.equals(ctx.sender)) throw new SenderError("player is not owned by sender");
  return player;
}

function findOwnedPlayerInRoom(ctx: any, roomId: string): any | undefined {
  for (const player of ctx.db.players.by_owner.filter(ctx.sender)) {
    if (player.roomId === roomId) return player;
  }
  return undefined;
}

function updateLearningStats(ctx: any, roomId: string, buildingId: string): void {
  const building = ctx.db.buildings.id.find(buildingId);
  if (!building) return;
  const portalIds = new Set<string>();
  for (const portal of ctx.db.learningPortals.by_building.filter(buildingId)) portalIds.add(portal.id);

  let activeQuestCount = 0;
  let completedQuestCount = 0;
  const categoryCounts: Record<string, number> = {};
  for (const player of ctx.db.players.by_room.filter(roomId)) {
    for (const quest of ctx.db.playerQuests.by_player.filter(player.id)) {
      if (!portalIds.has(quest.portalId)) continue;
      if (quest.status === "in_progress") activeQuestCount += 1;
      if (quest.status === "completed") completedQuestCount += 1;
      const portal = ctx.db.learningPortals.id.find(quest.portalId);
      if (portal) categoryCounts[portal.category] = (categoryCounts[portal.category] ?? 0) + 1;
    }
  }

  const id = `${roomId}:${buildingId}`;
  const existing = ctx.db.learningStats.id.find(id);
  const next = {
    id,
    roomId,
    campus: building.campus,
    buildingId,
    activeQuestCount,
    completedQuestCount,
    categoryCountsJson: JSON.stringify(categoryCounts),
    conceptTagCountsJson: existing?.conceptTagCountsJson ?? "{}",
    updatedAt: ctx.timestamp,
  };
  if (existing) ctx.db.learningStats.id.update(next);
  else ctx.db.learningStats.insert(next);
}

function seedDatabase(ctx: any): void {
  if (!ctx.db.rooms.id.find("room-demo")) {
    ctx.db.rooms.insert({
      id: "room-demo",
      name: "Fordham Tech Week",
      code: "RAMS",
      status: "live",
      createdAt: ctx.timestamp,
    });
  }
  for (const building of BUILDING_SEEDS) {
    if (!ctx.db.buildings.id.find(building.id)) ctx.db.buildings.insert(building);
  }
  for (const portal of PORTAL_SEEDS) {
    if (!ctx.db.learningPortals.id.find(portal.id)) ctx.db.learningPortals.insert(portal);
  }
  for (const building of BUILDING_SEEDS) updateLearningStats(ctx, "room-demo", building.id);
}

export const init = spacetimedb.init((ctx) => {
  seedDatabase(ctx);
});

export const onConnect = spacetimedb.clientConnected((ctx) => {
  for (const player of ctx.db.players.by_owner.filter(ctx.sender)) {
    ctx.db.players.id.update({ ...player, connected: true, updatedAt: ctx.timestamp });
  }
});

export const onDisconnect = spacetimedb.clientDisconnected((ctx) => {
  for (const player of ctx.db.players.by_owner.filter(ctx.sender)) {
    ctx.db.players.id.update({ ...player, connected: false, updatedAt: ctx.timestamp });
  }
});

export const createRoom = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    const roomName = cleanText(name, "name", 80);
    ctx.db.rooms.insert({
      id: makeId(ctx, "room"),
      name: roomName,
      code: uniqueRoomCode(ctx, roomName),
      status: "lobby",
      createdAt: ctx.timestamp,
    });
  },
);

export const setRoomStatus = spacetimedb.reducer(
  { roomId: t.string(), status: t.string() },
  (ctx, { roomId, status }) => {
    if (!ROOM_STATUSES.has(status)) throw new SenderError("invalid room status");
    const room = requireRoom(ctx, roomId);
    const ownerPlayer = findOwnedPlayerInRoom(ctx, roomId);
    if (!ownerPlayer) throw new SenderError("sender is not in room");
    ctx.db.rooms.id.update({ ...room, status });
  },
);

export const joinRoom = spacetimedb.reducer(
  { code: t.string(), displayName: t.string() },
  (ctx, { code, displayName }) => {
    const room = ctx.db.rooms.code.find(cleanText(code, "code", 8).toUpperCase());
    if (!room) throw new SenderError("room not found");
    requireOpenRoom(ctx, room.id);
    const name = cleanText(displayName, "displayName", 40);
    const existing = findOwnedPlayerInRoom(ctx, room.id);
    if (existing) {
      ctx.db.players.id.update({ ...existing, displayName: name, connected: true, updatedAt: ctx.timestamp });
      return;
    }
    const colorIndex = Math.floor(ctx.random() * AVATAR_COLORS.length);
    ctx.db.players.insert({
      id: makeId(ctx, "player"),
      owner: ctx.sender,
      roomId: room.id,
      displayName: name,
      avatarColor: AVATAR_COLORS[colorIndex] ?? AVATAR_COLORS[0]!,
      position: { x: 0, y: 0, z: 11 },
      rotationY: Math.PI,
      activeQuestId: undefined,
      connected: true,
      updatedAt: ctx.timestamp,
    });
  },
);

export const updatePlayerPose = spacetimedb.reducer(
  { playerId: t.string(), position: vec3, rotationY: t.f32() },
  (ctx, { playerId, position, rotationY }) => {
    const player = requireOwnedPlayer(ctx, playerId);
    requireOpenRoom(ctx, player.roomId);
    if (!player.connected) throw new SenderError("player is disconnected");
    if (![position.x, position.y, position.z, rotationY].every(Number.isFinite)) {
      throw new SenderError("pose values must be finite");
    }
    const bounded = {
      x: Math.max(-100, Math.min(100, position.x)),
      y: Math.max(0, Math.min(20, position.y)),
      z: Math.max(-100, Math.min(100, position.z)),
    };
    ctx.db.players.id.update({ ...player, position: bounded, rotationY, updatedAt: ctx.timestamp });
  },
);

export const createEvent = spacetimedb.reducer(
  {
    roomId: t.string(),
    creatorPlayerId: t.string(),
    title: t.string(),
    description: t.string(),
    buildingId: t.string(),
    tags: t.array(t.string()),
  },
  (ctx, { roomId, creatorPlayerId, title, description, buildingId, tags }) => {
    requireOpenRoom(ctx, roomId);
    const creator = requireOwnedPlayer(ctx, creatorPlayerId);
    if (creator.roomId !== roomId) throw new SenderError("creator is not in room");
    const building = ctx.db.buildings.id.find(buildingId);
    if (!building) throw new SenderError("building not found");
    const cleanTags = [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
    ctx.db.events.insert({
      id: makeId(ctx, "event"),
      roomId,
      creatorPlayerId,
      title: cleanText(title, "title", 100),
      description: cleanText(description, "description", 1000),
      buildingId,
      position: { x: building.position.x + 2, y: 0, z: building.position.z + 1 },
      startTime: ctx.timestamp,
      endTime: undefined,
      tags: cleanTags,
    });
  },
);

export const rsvpEvent = spacetimedb.reducer(
  { eventId: t.string(), playerId: t.string(), status: t.string() },
  (ctx, { eventId, playerId, status }) => {
    if (!RSVP_STATUSES.has(status)) throw new SenderError("invalid RSVP status");
    const event = ctx.db.events.id.find(eventId);
    if (!event) throw new SenderError("event not found");
    const player = requireOwnedPlayer(ctx, playerId);
    if (event.roomId !== player.roomId) throw new SenderError("player and event must share a room");
    for (const rsvp of ctx.db.eventRsvps.by_event.filter(eventId)) {
      if (rsvp.playerId === playerId) {
        ctx.db.eventRsvps.id.update({ ...rsvp, status });
        return;
      }
    }
    ctx.db.eventRsvps.insert({ id: makeId(ctx, "rsvp"), eventId, playerId, status });
  },
);

export const launchPortal = spacetimedb.reducer(
  { playerId: t.string(), portalId: t.string() },
  (ctx, { playerId, portalId }) => {
    const player = requireOwnedPlayer(ctx, playerId);
    requireOpenRoom(ctx, player.roomId);
    const portal = ctx.db.learningPortals.id.find(portalId);
    if (!portal) throw new SenderError("portal not found");
    let existing: any | undefined;
    for (const quest of ctx.db.playerQuests.by_player.filter(playerId)) {
      if (quest.portalId === portalId) existing = quest;
    }
    const questId = existing?.id ?? makeId(ctx, "quest");
    const quest = {
      id: questId,
      playerId,
      portalId,
      status: "in_progress",
      startedAt: existing?.startedAt ?? ctx.timestamp,
      completedAt: undefined,
      lastStatusCheckAt: ctx.timestamp,
    };
    if (existing) ctx.db.playerQuests.id.update(quest);
    else ctx.db.playerQuests.insert(quest);
    ctx.db.players.id.update({ ...player, activeQuestId: questId, updatedAt: ctx.timestamp });
    updateLearningStats(ctx, player.roomId, portal.buildingId);
  },
);

export const completeQuest = spacetimedb.reducer(
  { playerQuestId: t.string() },
  (ctx, { playerQuestId }) => {
    const quest = ctx.db.playerQuests.id.find(playerQuestId);
    if (!quest) throw new SenderError("player quest not found");
    const player = requireOwnedPlayer(ctx, quest.playerId);
    const portal = ctx.db.learningPortals.id.find(quest.portalId);
    ctx.db.playerQuests.id.update({
      ...quest,
      status: "completed",
      completedAt: ctx.timestamp,
      lastStatusCheckAt: ctx.timestamp,
    });
    if (player.activeQuestId === quest.id) {
      ctx.db.players.id.update({ ...player, activeQuestId: undefined, updatedAt: ctx.timestamp });
    }
    if (portal) updateLearningStats(ctx, player.roomId, portal.buildingId);
  },
);

export const updateConnection = spacetimedb.reducer(
  { playerId: t.string(), connected: t.bool() },
  (ctx, { playerId, connected }) => {
    const player = requireOwnedPlayer(ctx, playerId);
    ctx.db.players.id.update({ ...player, connected, updatedAt: ctx.timestamp });
  },
);

export const recordConceptTags = spacetimedb.reducer(
  { roomId: t.string(), buildingId: t.string(), tags: t.array(t.string()) },
  (ctx, { roomId, buildingId, tags }) => {
    if (!findOwnedPlayerInRoom(ctx, roomId)) throw new SenderError("sender is not in room");
    updateLearningStats(ctx, roomId, buildingId);
    const id = `${roomId}:${buildingId}`;
    const stat = ctx.db.learningStats.id.find(id);
    if (!stat) throw new SenderError("learning stats not found");
    let counts: Record<string, number> = {};
    try {
      counts = JSON.parse(stat.conceptTagCountsJson) as Record<string, number>;
    } catch {
      counts = {};
    }
    for (const tag of tags.map((value) => value.trim().toLowerCase()).filter(Boolean).slice(0, 12)) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
    ctx.db.learningStats.id.update({ ...stat, conceptTagCountsJson: JSON.stringify(counts), updatedAt: ctx.timestamp });
  },
);
