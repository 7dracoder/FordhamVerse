import { useSyncExternalStore } from "react";
import type { Player, PlayerQuest, EventRsvp, Vec3 } from "./types";
import { AVATAR_COLORS } from "./data";

interface GameState {
  players: Record<string, Player>;
  quests: Record<string, PlayerQuest>;
  rsvps: Record<string, EventRsvp>;
  myPlayerId: string | null;
  heatmapMode: boolean;
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

  private emit() {
    localStorage.setItem(
      "fordhamverse-live-v2",
      JSON.stringify({
        quests: this.state.quests,
        rsvps: this.state.rsvps,
        heatmapMode: this.state.heatmapMode,
      })
    );
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): GameState => this.state;

  joinRoom(displayName: string, _roomCode: string) {
    const id = makeId("player");
    const color = AVATAR_COLORS[this.colorIndex % AVATAR_COLORS.length];
    this.colorIndex++;

    const newPlayer: Player = {
      id,
      roomId: "room-demo",
      displayName: displayName.slice(0, 32),
      avatarColor: color,
      position: { x: 0, y: 0, z: 11 },
      rotationY: Math.PI,
      activeQuestId: null,
      connected: true,
    };

    this.state = {
      ...this.state,
      myPlayerId: id,
      players: { ...this.state.players, [id]: newPlayer },
    };
    this.emit();
  }

  leaveRoom() {
    if (!this.state.myPlayerId) return;
    const players = { ...this.state.players };
    delete players[this.state.myPlayerId];
    this.state = { ...this.state, myPlayerId: null, players };
    this.emit();
  }

  // Called from game loop — updates position in memory ONLY (no React re-render, no localStorage)
  updateMyPositionSilent(position: Vec3, rotationY: number) {
    const pid = this.state.myPlayerId;
    if (!pid || !this.state.players[pid]) return;
    // Mutate in-place so getSnapshot reference stays the same → useSyncExternalStore won't re-render
    const p = this.state.players[pid];
    p.position = { ...position };
    p.rotationY = rotationY;
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
    this.emit();
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
    this.emit();
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
    this.emit();
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
    this.emit();
  }
}

export const gameStore = new GameStore();

export function useGameStore() {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot);
}
