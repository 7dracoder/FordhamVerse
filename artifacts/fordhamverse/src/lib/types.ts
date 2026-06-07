export type Vec3 = { x: number; y: number; z: number };
export type Campus = "rose_hill" | "lincoln_center";
export type PortalCategory = "ml" | "frontend" | "infra" | "startup" | "data" | "general";
export type QuestStatus = "not_started" | "in_progress" | "completed";

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

export interface Building {
  id: string;
  name: string;
  shortName: string;
  position: Vec3;
  size: [number, number, number];
  campus: Campus;
  color: string;
  /** Optional architectural landmark feature rendered on top of the building. */
  landmark?: "tower" | "spire";
}

export interface LearningPortal {
  id: string;
  buildingId: string;
  title: string;
  description: string;
  /** Explicit world position for the portal. Falls back to a computed offset
   * from the building when omitted. Authored to sit in open ground. */
  position?: { x: number; z: number };
  category: PortalCategory;
  replitTemplateUrl: string;
  estimatedMinutes: number;
  skills: string[];
  difficulty: "Starter" | "Intermediate" | "Advanced";
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
  status: "going" | "interested";
}

export interface PlayerQuest {
  id: string;
  playerId: string;
  portalId: string;
  status: QuestStatus;
  startedAt: number | null;
  completedAt: number | null;
}

export interface LearningStat {
  buildingId: string;
  activeQuestCount: number;
  completedQuestCount: number;
}
