import { useSyncExternalStore } from "react";
import type { Player, PlayerQuest, EventRsvp, Vec3 } from "./types";
import { AVATAR_COLORS } from "./data";
import { DbConnection } from "@/module_bindings";

interface GameState {
  players: Record<string, Player>;
  quests: Record<string, PlayerQuest>;
  rsvps: Record<string, EventRsvp>;
  myPlayerId: string | null;
  heatmapMode: boolean;
}

/** Minimal structural shape of a SpacetimeDB `player` row. */
interface PlayerRow {
  identity: { toHexString(): string };
  room: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  rot: number;
  online: boolean;
}

const SPAWN: Vec3 = { x: 0, y: 0, z: 14 };
const SPAWN_ROT = Math.PI;

const MODULE_NAME = import.meta.env.VITE_STDB_MODULE || "fordhamverse";

/**
 * Where the browser connects to SpacetimeDB.
 * - Explicit override via `VITE_STDB_URI` always wins.
 * - In dev, connect through the api-server `/stdb` reverse proxy to the local
 *   standalone server.
 * - In production, connect to SpacetimeDB Maincloud directly.
 * The SDK upgrades http(s) → ws(s) automatically.
 */
function resolveStdbUri(): string {
  const uri = resolveStdbUriRaw();
  // The SDK builds the websocket URL via `new URL("v1/database/.../subscribe", uri)`.
  // Without a trailing slash, `new URL` strips the last path segment (e.g. `/stdb`),
  // which breaks the reverse-proxy route. Always normalize to a trailing slash.
  return uri.endsWith("/") ? uri : `${uri}/`;
}

function resolveStdbUriRaw(): string {
  const override = import.meta.env.VITE_STDB_URI;
  if (override) return override;
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return `${window.location.origin}/stdb`;
  }
  return "https://maincloud.spacetimedb.com";
}

function rowToPlayer(row: PlayerRow): Player {
  return {
    id: row.identity.toHexString(),
    roomId: row.room,
    displayName: row.name,
    avatarColor: row.color,
    position: { x: row.x, y: row.y, z: row.z },
    rotationY: row.rot,
    activeQuestId: null,
    connected: row.online,
  };
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const DEFAULT_STATE: GameState = {
  players: {},
  quests: {},
  rsvps: {},
  myPlayerId: null,
  heatmapMode: false,
};

class GameStore {
  private state: GameState = { ...DEFAULT_STATE };
  private listeners: Set<() => void> = new Set();
  private colorIndex = 0;

  // Multiplayer connection state
  private conn: DbConnection | null = null;
  private connected = false;
  private myId: string | null = null;
  private lastTxSent = 0;
  private pendingTx: { x: number; y: number; z: number; rot: number } | null = null;
  private txTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    try {
      const saved = localStorage.getItem("fordhamverse-live-v2");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<GameState>;
        // Only restore non-positional state — player positions reset on reload
        this.state = {
          ...DEFAULT_STATE,
          quests: parsed.quests ?? {},
          rsvps: parsed.rsvps ?? {},
          heatmapMode: parsed.heatmapMode ?? false,
          // Don't restore myPlayerId or players — force fresh session
        };
      }
    } catch {
      // ignore
    }
  }

  /** Notify React subscribers without touching localStorage. */
  private notify() {
    for (const listener of this.listeners) listener();
  }

  /** Persist durable state (quests/rsvps/heatmap) and notify subscribers. */
  private persist() {
    localStorage.setItem(
      "fordhamverse-live-v2",
      JSON.stringify({
        quests: this.state.quests,
        rsvps: this.state.rsvps,
        heatmapMode: this.state.heatmapMode,
      })
    );
    this.notify();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): GameState => this.state;

  joinRoom(displayName: string, roomCode: string) {
    const name = displayName.slice(0, 32);
    const room = (roomCode || "RAMS").trim().toUpperCase();
    const color = AVATAR_COLORS[this.colorIndex % AVATAR_COLORS.length];
    this.colorIndex++;
    this.connect(name, room, color);
  }

  /** Attempt a real multiplayer connection, falling back to a local session. */
  private connect(name: string, room: string, color: string) {
    let settled = false;

    const startLocal = () => {
      if (settled) return;
      settled = true;
      this.startLocalSession(name, room, color);
    };

    const timeout = setTimeout(() => {
      // Connection took too long — drop it and run locally.
      try {
        this.conn?.disconnect();
      } catch {
        // ignore
      }
      this.conn = null;
      startLocal();
    }, 6000);

    try {
      this.conn = DbConnection.builder()
        .withUri(resolveStdbUri())
        .withDatabaseName(MODULE_NAME)
        .onConnect((conn, identity) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);

          this.connected = true;
          this.myId = identity.toHexString();

          // Keep remote players in sync via row callbacks.
          conn.db.player.onInsert((_ctx, row) => this.upsertRemote(row));
          conn.db.player.onUpdate((_ctx, _old, row) => this.upsertRemote(row));
          conn.db.player.onDelete((_ctx, row) => this.removeRemote(row));

          const escapedRoom = room.replace(/'/g, "''");
          conn
            .subscriptionBuilder()
            .onError((ctx) =>
              console.warn("SpacetimeDB subscription error", ctx.event)
            )
            .subscribe(`SELECT * FROM player WHERE room = '${escapedRoom}'`);

          // Register our own presence on the server.
          conn.reducers.enterGame({ room, name, color });

          // Add our locally-authoritative player immediately.
          const self: Player = {
            id: this.myId,
            roomId: room,
            displayName: name,
            avatarColor: color,
            position: { ...SPAWN },
            rotationY: SPAWN_ROT,
            activeQuestId: null,
            connected: true,
          };
          this.state = {
            ...this.state,
            myPlayerId: this.myId,
            players: { ...this.state.players, [this.myId]: self },
          };
          this.notify();
        })
        .onConnectError((_ctx, err) => {
          clearTimeout(timeout);
          console.warn("SpacetimeDB connect error — running locally", err);
          this.conn = null;
          startLocal();
        })
        .onDisconnect(() => {
          this.connected = false;
        })
        .build();
    } catch (err) {
      clearTimeout(timeout);
      console.warn("SpacetimeDB unavailable — running locally", err);
      this.conn = null;
      startLocal();
    }
  }

  /** Single-player fallback when SpacetimeDB cannot be reached. */
  private startLocalSession(name: string, room: string, color: string) {
    const id = makeId("player");
    const newPlayer: Player = {
      id,
      roomId: room,
      displayName: name,
      avatarColor: color,
      position: { ...SPAWN },
      rotationY: SPAWN_ROT,
      activeQuestId: null,
      connected: true,
    };
    this.state = {
      ...this.state,
      myPlayerId: id,
      players: { ...this.state.players, [id]: newPlayer },
    };
    this.notify();
  }

  /** Upsert a remote player from a server row (ignores our own row). */
  private upsertRemote(row: PlayerRow) {
    const id = row.identity.toHexString();
    if (id === this.myId) return; // self is locally authoritative
    this.state = {
      ...this.state,
      players: { ...this.state.players, [id]: rowToPlayer(row) },
    };
    this.notify();
  }

  /** Remove a remote player whose row was deleted. */
  private removeRemote(row: PlayerRow) {
    const id = row.identity.toHexString();
    if (id === this.myId) return;
    if (!this.state.players[id]) return;
    const players = { ...this.state.players };
    delete players[id];
    this.state = { ...this.state, players };
    this.notify();
  }

  leaveRoom() {
    if (this.conn) {
      try {
        if (this.connected) this.conn.reducers.leaveGame({});
        this.conn.disconnect();
      } catch {
        // ignore
      }
    }
    if (this.txTimer) {
      clearTimeout(this.txTimer);
      this.txTimer = null;
    }
    this.conn = null;
    this.connected = false;
    this.myId = null;
    this.pendingTx = null;
    this.state = { ...this.state, myPlayerId: null, players: {} };
    this.notify();
  }

  // Called from game loop — updates position in memory ONLY (no React re-render,
  // no localStorage) and forwards a throttled transform to the server.
  updateMyPositionSilent(position: Vec3, rotationY: number) {
    const pid = this.state.myPlayerId;
    if (!pid || !this.state.players[pid]) return;
    // Mutate in-place so getSnapshot reference stays the same → no re-render
    const p = this.state.players[pid];
    p.position = { ...position };
    p.rotationY = rotationY;

    // Forward to the server (throttled). CampusScene already throttles to ~10/s.
    if (!this.conn || !this.connected) return;
    this.pendingTx = { x: position.x, y: position.y, z: position.z, rot: rotationY };
    const now = Date.now();
    const elapsed = now - this.lastTxSent;
    if (elapsed >= 100) {
      this.flushTransform();
    } else if (!this.txTimer) {
      this.txTimer = setTimeout(() => {
        this.txTimer = null;
        this.flushTransform();
      }, 100 - elapsed);
    }
  }

  private flushTransform() {
    const tx = this.pendingTx;
    if (!tx || !this.conn || !this.connected) return;
    this.pendingTx = null;
    this.lastTxSent = Date.now();
    try {
      this.conn.reducers.updateTransform(tx);
    } catch {
      // ignore transient send errors
    }
  }

  startQuest(portalId: string) {
    const pid = this.state.myPlayerId;
    if (!pid || !this.state.players[pid]) return;

    const questId = makeId("quest");
    const updatedPlayer = { ...this.state.players[pid], activeQuestId: questId };
    const newQuest: PlayerQuest = {
      id: questId,
      playerId: pid,
      portalId,
      status: "in_progress",
      startedAt: Date.now(),
      completedAt: null,
    };

    this.state = {
      ...this.state,
      players: { ...this.state.players, [pid]: updatedPlayer },
      quests: { ...this.state.quests, [questId]: newQuest },
    };
    this.persist();
  }

  completeQuest() {
    const pid = this.state.myPlayerId;
    if (!pid) return;
    const qid = this.state.players[pid]?.activeQuestId;
    if (!qid || !this.state.quests[qid]) return;

    const updatedQuest: PlayerQuest = {
      ...this.state.quests[qid],
      status: "completed",
      completedAt: Date.now(),
    };
    const updatedPlayer = { ...this.state.players[pid], activeQuestId: null };

    this.state = {
      ...this.state,
      players: { ...this.state.players, [pid]: updatedPlayer },
      quests: { ...this.state.quests, [qid]: updatedQuest },
    };
    this.persist();
  }

  rsvpEvent(eventId: string, status: "going" | "interested") {
    const pid = this.state.myPlayerId;
    if (!pid) return;
    const rsvpId = `rsvp-${eventId}-${pid}`;
    const rsvp: EventRsvp = { id: rsvpId, eventId, playerId: pid, status };
    this.state = {
      ...this.state,
      rsvps: { ...this.state.rsvps, [rsvpId]: rsvp },
    };
    this.persist();
  }

  getRsvpStatus(eventId: string): "going" | "interested" | null {
    const pid = this.state.myPlayerId;
    if (!pid) return null;
    const rsvpId = `rsvp-${eventId}-${pid}`;
    return this.state.rsvps[rsvpId]?.status ?? null;
  }

  getActiveQuest(): PlayerQuest | null {
    const pid = this.state.myPlayerId;
    if (!pid) return null;
    const qid = this.state.players[pid]?.activeQuestId;
    if (!qid) return null;
    return this.state.quests[qid] ?? null;
  }

  toggleHeatmap() {
    this.state = { ...this.state, heatmapMode: !this.state.heatmapMode };
    this.persist();
  }
}

export const gameStore = new GameStore();

export function useGameStore() {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot);
}
