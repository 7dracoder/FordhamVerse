export type Campus = "rose_hill" | "lincoln_center";
export type PortalCategory = "ml" | "frontend" | "infra" | "startup" | "data" | "general";
export type QuestStatus = "not_started" | "in_progress" | "completed";
export type RsvpStatus = "going" | "interested";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  status: "lobby" | "live" | "ended";
  createdAt: number;
}

export interface Player {
  id: string;
  roomId: string;
  displayName: string;
  avatarColor: string;
  position: Vec3;
  rotationY: number;
  activeQuestId: string | null;
  connected: boolean;
}

export interface CampusEvent {
  id: string;
  roomId: string;
  creatorPlayerId: string;
  title: string;
  description: string;
  buildingId: string;
  position: Vec3;
  startTime: number;
  endTime: number | null;
  tags: string[];
}

export interface EventRsvp {
  id: string;
  eventId: string;
  playerId: string;
  status: RsvpStatus;
}

export interface Building {
  id: string;
  name: string;
  shortName: string;
  position: Vec3;
  size: [number, number, number];
  campus: Campus;
  color: string;
}

export interface LearningPortal {
  id: string;
  buildingId: string;
  title: string;
  description: string;
  category: PortalCategory;
  replitTemplateUrl: string;
  estimatedMinutes: number;
  skills: string[];
  difficulty: "Starter" | "Intermediate" | "Advanced";
}

export interface PlayerQuest {
  id: string;
  playerId: string;
  portalId: string;
  status: QuestStatus;
  startedAt: number | null;
  completedAt: number | null;
  lastStatusCheckAt: number | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  tags?: string[];
}

export interface RealtimeState {
  rooms: Room[];
  players: Player[];
  events: CampusEvent[];
  eventRsvps: EventRsvp[];
  buildings: Building[];
  portals: LearningPortal[];
  playerQuests: PlayerQuest[];
}

export interface LearningStat {
  buildingId: string;
  activeQuestCount: number;
  completedQuestCount: number;
  categoryCounts: Partial<Record<PortalCategory, number>>;
}
