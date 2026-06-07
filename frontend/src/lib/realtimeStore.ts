import { BUILDINGS, createInitialState, DEMO_ROOM, PORTALS } from "./data";
import type {
  CampusEvent,
  LearningStat,
  Player,
  PlayerQuest,
  RealtimeState,
  RsvpStatus,
  Vec3,
} from "./types";

const STORAGE_KEY = "fordhamverse-live-state-v1";
const CHANNEL_KEY = "fordhamverse-live";
const COLORS = ["#22c55e", "#38bdf8", "#f97316", "#a78bfa", "#f43f5e", "#facc15"];

export interface RealtimeStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => RealtimeState;
  joinRoom: (code: string, displayName: string) => Player | Promise<Player>;
  reconnectPlayer: (playerId: string) => Player | null | Promise<Player | null>;
  updatePlayerPose: (playerId: string, position: Vec3, rotationY: number) => void;
  updateConnection: (playerId: string, connected: boolean) => void;
  createEvent: (input: {
    playerId: string;
    title: string;
    description: string;
    buildingId: string;
    tags: string[];
  }) => unknown;
  rsvpEvent: (eventId: string, playerId: string, status: RsvpStatus) => void;
  launchPortal: (playerId: string, portalId: string) => unknown;
  completeQuest: (playerQuestId: string) => void;
  learningStats: (roomId: string) => LearningStat[];
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cloneState(state: RealtimeState): RealtimeState {
  return structuredClone(state);
}

function loadState(): RealtimeState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as RealtimeState;
    if (!parsed.rooms?.some((room) => room.code === DEMO_ROOM.code)) return createInitialState();
    return parsed;
  } catch {
    return createInitialState();
  }
}

class LocalRealtimeStore {
  private state: RealtimeState;
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    this.state = loadState();
    if ("BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL_KEY);
      this.channel.onmessage = (event: MessageEvent<RealtimeState>) => {
        this.state = event.data;
        this.notify(false);
      };
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): RealtimeState => this.state;

  joinRoom(code: string, displayName: string): Player {
    const room = this.state.rooms.find((item) => item.code === code.trim().toUpperCase());
    if (!room || room.status === "ended") throw new Error("Room not found. Try RAMS.");
    const cleanedName = displayName.trim();
    if (!cleanedName) throw new Error("Display name required.");

    const player: Player = {
      id: makeId("player"),
      roomId: room.id,
      displayName: cleanedName.slice(0, 32),
      avatarColor: COLORS[this.state.players.length % COLORS.length] ?? COLORS[0]!,
      position: { x: 0, y: 0, z: 11 },
      rotationY: Math.PI,
      activeQuestId: null,
      connected: true,
    };
    this.update((draft) => {
      draft.players.push(player);
    });
    return player;
  }

  reconnectPlayer(playerId: string): Player | null {
    const player = this.state.players.find((item) => item.id === playerId) ?? null;
    if (player && !player.connected) {
      this.update((draft) => {
        const target = draft.players.find((item) => item.id === playerId);
        if (target) target.connected = true;
      });
    }
    return player;
  }

  updatePlayerPose(playerId: string, position: Vec3, rotationY: number): void {
    this.update((draft) => {
      const player = draft.players.find((item) => item.id === playerId);
      if (!player || !player.connected) return;
      player.position = { ...position };
      player.rotationY = rotationY;
    });
  }

  updateConnection(playerId: string, connected: boolean): void {
    this.update((draft) => {
      const player = draft.players.find((item) => item.id === playerId);
      if (player) player.connected = connected;
    });
  }

  createEvent(input: {
    playerId: string;
    title: string;
    description: string;
    buildingId: string;
    tags: string[];
  }): CampusEvent {
    const player = this.state.players.find((item) => item.id === input.playerId);
    const building = this.state.buildings.find((item) => item.id === input.buildingId);
    if (!player || !building) throw new Error("Player or building missing.");
    const event: CampusEvent = {
      id: makeId("event"),
      roomId: player.roomId,
      creatorPlayerId: player.id,
      title: input.title.trim().slice(0, 100),
      description: input.description.trim().slice(0, 500),
      buildingId: building.id,
      position: { x: building.position.x + building.size[0] / 2 + 1.2, y: 0, z: building.position.z },
      startTime: Date.now(),
      endTime: null,
      tags: input.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 5),
    };
    if (!event.title || !event.description) throw new Error("Title and description required.");
    this.update((draft) => {
      draft.events.push(event);
    });
    return event;
  }

  rsvpEvent(eventId: string, playerId: string, status: RsvpStatus): void {
    this.update((draft) => {
      const existing = draft.eventRsvps.find((item) => item.eventId === eventId && item.playerId === playerId);
      if (existing) {
        existing.status = status;
      } else {
        draft.eventRsvps.push({ id: makeId("rsvp"), eventId, playerId, status });
      }
    });
  }

  launchPortal(playerId: string, portalId: string): PlayerQuest {
    let result: PlayerQuest | null = null;
    this.update((draft) => {
      const player = draft.players.find((item) => item.id === playerId);
      if (!player) return;
      let quest = draft.playerQuests.find((item) => item.playerId === playerId && item.portalId === portalId);
      if (!quest) {
        quest = {
          id: makeId("quest"),
          playerId,
          portalId,
          status: "in_progress",
          startedAt: Date.now(),
          completedAt: null,
          lastStatusCheckAt: Date.now(),
        };
        draft.playerQuests.push(quest);
      } else {
        quest.status = "in_progress";
        quest.startedAt ??= Date.now();
        quest.completedAt = null;
        quest.lastStatusCheckAt = Date.now();
      }
      player.activeQuestId = quest.id;
      result = structuredClone(quest);
    });
    if (!result) throw new Error("Could not launch quest.");
    return result;
  }

  completeQuest(playerQuestId: string): void {
    this.update((draft) => {
      const quest = draft.playerQuests.find((item) => item.id === playerQuestId);
      if (!quest) return;
      quest.status = "completed";
      quest.completedAt = Date.now();
      quest.lastStatusCheckAt = Date.now();
      const player = draft.players.find((item) => item.id === quest.playerId);
      if (player?.activeQuestId === quest.id) player.activeQuestId = null;
    });
  }

  learningStats(roomId: string): LearningStat[] {
    const playerIds = new Set(this.state.players.filter((item) => item.roomId === roomId).map((item) => item.id));
    return this.state.buildings.map((building) => {
      const portalIds = new Set(
        this.state.portals.filter((portal) => portal.buildingId === building.id).map((portal) => portal.id),
      );
      const quests = this.state.playerQuests.filter(
        (quest) => playerIds.has(quest.playerId) && portalIds.has(quest.portalId),
      );
      const categoryCounts: LearningStat["categoryCounts"] = {};
      for (const quest of quests) {
        const portal = this.state.portals.find((item) => item.id === quest.portalId);
        if (portal) categoryCounts[portal.category] = (categoryCounts[portal.category] ?? 0) + 1;
      }
      return {
        buildingId: building.id,
        activeQuestCount: quests.filter((quest) => quest.status === "in_progress").length,
        completedQuestCount: quests.filter((quest) => quest.status === "completed").length,
        categoryCounts,
      };
    });
  }

  private update(mutator: (draft: RealtimeState) => void): void {
    const draft = cloneState(this.state);
    mutator(draft);
    this.state = draft;
    this.notify(true);
  }

  private notify(broadcast: boolean): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Demo still works when storage is unavailable.
    }
    if (broadcast) this.channel?.postMessage(this.state);
    this.listeners.forEach((listener) => listener());
  }
}

class SpacetimeRealtimeStore implements RealtimeStore {
  private readonly local: LocalRealtimeStore;
  private readonly uri: string;
  private readonly database: string;
  private listeners = new Set<() => void>();
  private connection: any = null;
  private identity: any = null;
  private active = false;
  private remoteState: RealtimeState = {
    rooms: [],
    players: [],
    events: [],
    eventRsvps: [],
    buildings: BUILDINGS,
    portals: PORTALS,
    playerQuests: [],
  };
  private readonly ready: Promise<void>;

  constructor(local: LocalRealtimeStore, uri: string, database: string) {
    this.local = local;
    this.uri = uri;
    this.database = database;
    this.local.subscribe(() => {
      if (!this.active) this.notify();
    });
    this.ready = this.connect();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): RealtimeState => (this.active ? this.remoteState : this.local.getSnapshot());

  async joinRoom(code: string, displayName: string): Promise<Player> {
    await this.ready;
    if (!this.active) return this.local.joinRoom(code, displayName);
    await this.connection.reducers.joinRoom({ code: code.trim().toUpperCase(), displayName: displayName.trim() });
    this.rebuildRemoteState();
    const room = this.remoteState.rooms.find((item) => item.code === code.trim().toUpperCase());
    const row = Array.from(this.connection.db.players.iter()).find(
      (item: any) => item.roomId === room?.id && item.owner.equals(this.identity),
    ) as any | undefined;
    if (!row) throw new Error("SpacetimeDB joined room but player row was not found.");
    return this.mapPlayer(row);
  }

  async reconnectPlayer(playerId: string): Promise<Player | null> {
    await this.ready;
    if (!this.active) return this.local.reconnectPlayer(playerId);
    const row = this.connection.db.players.id.find(playerId);
    if (!row || !row.owner.equals(this.identity)) return null;
    if (!row.connected) await this.connection.reducers.updateConnection({ playerId, connected: true });
    this.rebuildRemoteState();
    return this.remoteState.players.find((item) => item.id === playerId) ?? null;
  }

  updatePlayerPose(playerId: string, position: Vec3, rotationY: number): void {
    if (!this.active) {
      this.local.updatePlayerPose(playerId, position, rotationY);
      return;
    }
    void this.connection.reducers.updatePlayerPose({ playerId, position, rotationY });
  }

  updateConnection(playerId: string, connected: boolean): void {
    if (!this.active) {
      this.local.updateConnection(playerId, connected);
      return;
    }
    void this.connection.reducers.updateConnection({ playerId, connected });
  }

  async createEvent(input: {
    playerId: string;
    title: string;
    description: string;
    buildingId: string;
    tags: string[];
  }): Promise<void> {
    await this.ready;
    if (!this.active) {
      this.local.createEvent(input);
      return;
    }
    const player = this.remoteState.players.find((item) => item.id === input.playerId);
    if (!player) throw new Error("Player missing.");
    await this.connection.reducers.createEvent({
      roomId: player.roomId,
      creatorPlayerId: input.playerId,
      title: input.title,
      description: input.description,
      buildingId: input.buildingId,
      tags: input.tags,
    });
  }

  rsvpEvent(eventId: string, playerId: string, status: RsvpStatus): void {
    if (!this.active) {
      this.local.rsvpEvent(eventId, playerId, status);
      return;
    }
    void this.connection.reducers.rsvpEvent({ eventId, playerId, status });
  }

  async launchPortal(playerId: string, portalId: string): Promise<void> {
    await this.ready;
    if (!this.active) {
      this.local.launchPortal(playerId, portalId);
      return;
    }
    await this.connection.reducers.launchPortal({ playerId, portalId });
  }

  completeQuest(playerQuestId: string): void {
    if (!this.active) {
      this.local.completeQuest(playerQuestId);
      return;
    }
    void this.connection.reducers.completeQuest({ playerQuestId });
  }

  learningStats(roomId: string): LearningStat[] {
    const state = this.getSnapshot();
    const playerIds = new Set(state.players.filter((item) => item.roomId === roomId).map((item) => item.id));
    return state.buildings.map((building) => {
      const portalIds = new Set(state.portals.filter((portal) => portal.buildingId === building.id).map((portal) => portal.id));
      const quests = state.playerQuests.filter((quest) => playerIds.has(quest.playerId) && portalIds.has(quest.portalId));
      const categoryCounts: LearningStat["categoryCounts"] = {};
      for (const quest of quests) {
        const portal = state.portals.find((item) => item.id === quest.portalId);
        if (portal) categoryCounts[portal.category] = (categoryCounts[portal.category] ?? 0) + 1;
      }
      return {
        buildingId: building.id,
        activeQuestCount: quests.filter((quest) => quest.status === "in_progress").length,
        completedQuestCount: quests.filter((quest) => quest.status === "completed").length,
        categoryCounts,
      };
    });
  }

  private async connect(): Promise<void> {
    try {
      const { DbConnection } = await import("../module_bindings");
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };
        const timeout = window.setTimeout(finish, 5000);
        const token = window.localStorage.getItem("fordhamverse-spacetimedb-token") ?? undefined;
        const connection = DbConnection.builder()
          .withUri(this.uri)
          .withDatabaseName(this.database)
          .withToken(token)
          .onConnect((conn, identity, freshToken) => {
            this.connection = conn;
            this.identity = identity;
            window.localStorage.setItem("fordhamverse-spacetimedb-token", freshToken);
            const bump = () => {
              if (!this.active) return;
              this.rebuildRemoteState();
            };
            for (const table of [
              conn.db.rooms,
              conn.db.players,
              conn.db.events,
              conn.db.eventRsvps,
              conn.db.buildings,
              conn.db.learningPortals,
              conn.db.playerQuests,
            ]) {
              table.onInsert(bump);
              table.onUpdate(bump);
              table.onDelete(bump);
            }
            conn.subscriptionBuilder().onApplied(() => {
              window.clearTimeout(timeout);
              this.active = true;
              this.rebuildRemoteState();
              finish();
            }).subscribeToAllTables();
          })
          .onDisconnect(() => {
            this.active = false;
            this.notify();
          })
          .onConnectError((_ctx, error) => {
            console.warn("SpacetimeDB unavailable; using local realtime adapter.", error);
            window.clearTimeout(timeout);
            finish();
          })
          .build();
        this.connection = connection;
      });
    } catch (error) {
      console.warn("SpacetimeDB adapter failed to initialize; using local realtime adapter.", error);
    }
  }

  private mapPlayer(row: any): Player {
    return {
      id: row.id,
      roomId: row.roomId,
      displayName: row.displayName,
      avatarColor: row.avatarColor,
      position: { ...row.position },
      rotationY: row.rotationY,
      activeQuestId: row.activeQuestId ?? null,
      connected: row.connected,
    };
  }

  private rebuildRemoteState(): void {
    if (!this.connection) return;
    const connection = this.connection;
    this.remoteState = {
      rooms: Array.from(connection.db.rooms.iter()).map((row: any) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        status: row.status,
        createdAt: Number(row.createdAt.toMillis()),
      })),
      players: Array.from(connection.db.players.iter()).map((row: any) => this.mapPlayer(row)),
      events: Array.from(connection.db.events.iter()).map((row: any) => ({
        id: row.id,
        roomId: row.roomId,
        creatorPlayerId: row.creatorPlayerId,
        title: row.title,
        description: row.description,
        buildingId: row.buildingId,
        position: { ...row.position },
        startTime: Number(row.startTime.toMillis()),
        endTime: row.endTime ? Number(row.endTime.toMillis()) : null,
        tags: [...row.tags],
      })),
      eventRsvps: Array.from(connection.db.eventRsvps.iter()).map((row: any) => ({
        id: row.id,
        eventId: row.eventId,
        playerId: row.playerId,
        status: row.status,
      })),
      buildings: Array.from(connection.db.buildings.iter()).map((row: any) => {
        const visual = BUILDINGS.find((item) => item.id === row.id);
        return {
          id: row.id,
          name: row.name,
          shortName: visual?.shortName ?? row.name.toUpperCase(),
          position: { ...row.position },
          size: visual?.size ?? [4, 2.5, 4],
          campus: row.campus,
          color: visual?.color ?? "#6e2837",
        };
      }),
      portals: Array.from(connection.db.learningPortals.iter()).map((row: any) => {
        const detail = PORTALS.find((item) => item.id === row.id);
        return {
          id: row.id,
          buildingId: row.buildingId,
          title: row.title,
          description: row.description,
          category: row.category,
          replitTemplateUrl: row.replitTemplateUrl,
          estimatedMinutes: row.estimatedMinutes,
          skills: [...row.skills],
          difficulty: detail?.difficulty ?? "Intermediate",
        };
      }),
      playerQuests: Array.from(connection.db.playerQuests.iter()).map((row: any) => ({
        id: row.id,
        playerId: row.playerId,
        portalId: row.portalId,
        status: row.status,
        startedAt: row.startedAt ? Number(row.startedAt.toMillis()) : null,
        completedAt: row.completedAt ? Number(row.completedAt.toMillis()) : null,
        lastStatusCheckAt: row.lastStatusCheckAt ? Number(row.lastStatusCheckAt.toMillis()) : null,
      })),
    } as RealtimeState;
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

const localStore = new LocalRealtimeStore();
const spacetimeUri = import.meta.env.VITE_SPACETIMEDB_URI as string | undefined;
const spacetimeDatabase = import.meta.env.VITE_SPACETIMEDB_DATABASE as string | undefined;

export const realtimeStore: RealtimeStore =
  spacetimeUri && spacetimeDatabase
    ? new SpacetimeRealtimeStore(localStore, spacetimeUri, spacetimeDatabase)
    : localStore;
