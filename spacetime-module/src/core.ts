// Deterministic in-memory implementation used by tests and offline demos.
import { seedBuildings, seedPortals } from "./seed.js";
import type {
  CampusEvent,
  DatabaseState,
  EventRsvp,
  LearningStat,
  Player,
  PlayerQuest,
  Room,
  RsvpStatus,
  Vec3,
} from "./types.js";

export * from "./types.js";
export * from "./seed.js";

type Clock = () => number;

const AVATAR_COLORS = ["#f97316", "#22c55e", "#38bdf8", "#a78bfa", "#f43f5e", "#facc15"];

function clone<T>(value: T): T {
  return structuredClone(value);
}

function cleanText(value: string, field: string, maxLength = 120): string {
  const cleaned = value.trim();
  if (!cleaned) throw new Error(`${field} is required`);
  if (cleaned.length > maxLength) throw new Error(`${field} exceeds ${maxLength} characters`);
  return cleaned;
}

function validateVec3(value: Vec3): Vec3 {
  if (![value.x, value.y, value.z].every(Number.isFinite)) {
    throw new Error("position must contain finite x, y, and z values");
  }
  return { ...value };
}

export class FordhamVerseModule {
  private readonly clock: Clock;
  private counter = 0;
  private state: DatabaseState;

  constructor(clock: Clock = Date.now) {
    this.clock = clock;
    this.state = {
      rooms: [],
      players: [],
      events: [],
      eventRsvps: [],
      buildings: clone(seedBuildings),
      learningPortals: clone(seedPortals),
      playerQuests: [],
    };
  }

  snapshot(): DatabaseState {
    return clone(this.state);
  }

  create_room(name: string): Room {
    const roomName = cleanText(name, "name", 80);
    const room: Room = {
      id: this.nextId("room"),
      name: roomName,
      code: this.uniqueRoomCode(roomName),
      status: "lobby",
      createdAt: this.clock(),
    };
    this.state.rooms.push(room);
    return clone(room);
  }

  join_room(code: string, displayName: string): Player {
    const normalizedCode = cleanText(code, "code", 8).toUpperCase();
    const room = this.state.rooms.find((item) => item.code === normalizedCode);
    if (!room) throw new Error("room not found");
    this.assertRoomOpen(room);

    const player: Player = {
      id: this.nextId("player"),
      roomId: room.id,
      displayName: cleanText(displayName, "displayName", 40),
      avatarColor: AVATAR_COLORS[this.counter % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!,
      position: { x: 0, y: 0, z: 10 },
      rotationY: Math.PI,
      activeQuestId: null,
      connected: true,
    };
    this.state.players.push(player);
    return clone(player);
  }

  update_player_pose(playerId: string, position: Vec3, rotationY: number): Player {
    const player = this.requirePlayer(playerId);
    if (!player.connected) throw new Error("player is disconnected");
    const room = this.requireRoom(player.roomId);
    this.assertRoomOpen(room);
    if (!Number.isFinite(rotationY)) throw new Error("rotationY must be finite");

    player.position = validateVec3(position);
    player.rotationY = rotationY;
    return clone(player);
  }

  create_event(
    roomId: string,
    creatorPlayerId: string,
    title: string,
    description: string,
    buildingId: string,
    tags: string[],
  ): CampusEvent {
    const room = this.requireRoom(roomId);
    this.assertRoomOpen(room);
    const creator = this.requirePlayer(creatorPlayerId);
    if (creator.roomId !== roomId) throw new Error("creator is not in room");
    const building = this.state.buildings.find((item) => item.id === buildingId);
    if (!building) throw new Error("building not found");

    const event: CampusEvent = {
      id: this.nextId("event"),
      roomId,
      creatorPlayerId,
      title: cleanText(title, "title", 100),
      description: cleanText(description, "description", 1000),
      buildingId,
      position: { x: building.position.x + 1.8, y: 0, z: building.position.z + 1.2 },
      startTime: this.clock(),
      endTime: null,
      tags: [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 8),
    };
    this.state.events.push(event);
    return clone(event);
  }

  rsvp_event(eventId: string, playerId: string, status: RsvpStatus): EventRsvp {
    if (status !== "going" && status !== "interested") throw new Error("invalid RSVP status");
    const event = this.requireEvent(eventId);
    const player = this.requirePlayer(playerId);
    if (event.roomId !== player.roomId) throw new Error("player and event must share a room");

    const existing = this.state.eventRsvps.find((item) => item.eventId === eventId && item.playerId === playerId);
    if (existing) {
      existing.status = status;
      return clone(existing);
    }

    const rsvp: EventRsvp = { id: this.nextId("rsvp"), eventId, playerId, status };
    this.state.eventRsvps.push(rsvp);
    return clone(rsvp);
  }

  launch_portal(playerId: string, portalId: string): PlayerQuest {
    const player = this.requirePlayer(playerId);
    const portal = this.state.learningPortals.find((item) => item.id === portalId);
    if (!portal) throw new Error("portal not found");

    let quest = this.state.playerQuests.find((item) => item.playerId === playerId && item.portalId === portalId);
    if (!quest) {
      quest = {
        id: this.nextId("quest"),
        playerId,
        portalId,
        status: "in_progress",
        startedAt: this.clock(),
        completedAt: null,
        lastStatusCheckAt: this.clock(),
      };
      this.state.playerQuests.push(quest);
    } else {
      quest.status = "in_progress";
      quest.startedAt ??= this.clock();
      quest.completedAt = null;
      quest.lastStatusCheckAt = this.clock();
    }
    player.activeQuestId = quest.id;
    return clone(quest);
  }

  complete_quest(playerQuestId: string): PlayerQuest {
    const quest = this.state.playerQuests.find((item) => item.id === playerQuestId);
    if (!quest) throw new Error("player quest not found");
    quest.status = "completed";
    quest.completedAt = this.clock();
    quest.lastStatusCheckAt = this.clock();
    const player = this.requirePlayer(quest.playerId);
    if (player.activeQuestId === quest.id) player.activeQuestId = null;
    return clone(quest);
  }

  update_connection(playerId: string, connected: boolean): Player {
    const player = this.requirePlayer(playerId);
    player.connected = connected;
    return clone(player);
  }

  sub_room(roomId: string): Room | null {
    return clone(this.state.rooms.find((item) => item.id === roomId) ?? null);
  }

  sub_players(roomId: string): Player[] {
    return clone(this.state.players.filter((item) => item.roomId === roomId));
  }

  sub_events(roomId: string): { events: CampusEvent[]; rsvps: EventRsvp[] } {
    const events = this.state.events.filter((item) => item.roomId === roomId);
    const ids = new Set(events.map((item) => item.id));
    return clone({ events, rsvps: this.state.eventRsvps.filter((item) => ids.has(item.eventId)) });
  }

  sub_portals(): { buildings: DatabaseState["buildings"]; portals: DatabaseState["learningPortals"] } {
    return clone({ buildings: this.state.buildings, portals: this.state.learningPortals });
  }

  sub_player_quests(playerId: string): PlayerQuest[] {
    return clone(this.state.playerQuests.filter((item) => item.playerId === playerId));
  }

  sub_learning_stats(roomId: string): LearningStat[] {
    const roomPlayerIds = new Set(this.sub_players(roomId).map((item) => item.id));
    return this.state.buildings.map((building) => {
      const portalIds = new Set(
        this.state.learningPortals.filter((portal) => portal.buildingId === building.id).map((portal) => portal.id),
      );
      const quests = this.state.playerQuests.filter(
        (quest) => roomPlayerIds.has(quest.playerId) && portalIds.has(quest.portalId),
      );
      const categoryCounts: LearningStat["categoryCounts"] = {};
      for (const quest of quests) {
        const portal = this.state.learningPortals.find((item) => item.id === quest.portalId);
        if (portal) categoryCounts[portal.category] = (categoryCounts[portal.category] ?? 0) + 1;
      }
      return {
        roomId,
        buildingId: building.id,
        activeQuestCount: quests.filter((quest) => quest.status === "in_progress").length,
        completedQuestCount: quests.filter((quest) => quest.status === "completed").length,
        categoryCounts,
      };
    });
  }

  private nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${this.counter.toString(36).padStart(4, "0")}`;
  }

  private uniqueRoomCode(name: string): string {
    const base = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(4, "X");
    if (!this.state.rooms.some((room) => room.code === base)) return base;
    return `${base.slice(0, 2)}${this.counter.toString(36).toUpperCase().padStart(2, "0").slice(-2)}`;
  }

  private requireRoom(roomId: string): Room {
    const room = this.state.rooms.find((item) => item.id === roomId);
    if (!room) throw new Error("room not found");
    return room;
  }

  private requirePlayer(playerId: string): Player {
    const player = this.state.players.find((item) => item.id === playerId);
    if (!player) throw new Error("player not found");
    return player;
  }

  private requireEvent(eventId: string): CampusEvent {
    const event = this.state.events.find((item) => item.id === eventId);
    if (!event) throw new Error("event not found");
    return event;
  }

  private assertRoomOpen(room: Room): void {
    if (room.status === "ended") throw new Error("room has ended");
  }
}
