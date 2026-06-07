import type { Building, CampusEvent, LearningPortal, Player, PlayerQuest, RealtimeState, Room } from "./types";

export const DEMO_ROOM: Room = {
  id: "room-demo",
  name: "Fordham Tech Week",
  code: "RAMS",
  status: "live",
  createdAt: Date.now(),
};

export const BUILDINGS: Building[] = [
  {
    id: "building-keating",
    name: "Keating Hall",
    shortName: "KEATING",
    position: { x: 0, y: 0, z: -7 },
    size: [5.8, 3.6, 3.8],
    campus: "rose_hill",
    color: "#6e2837",
  },
  {
    id: "building-walsh",
    name: "Walsh Library",
    shortName: "WALSH",
    position: { x: -8, y: 0, z: 0 },
    size: [4.2, 2.8, 5],
    campus: "rose_hill",
    color: "#7b3340",
  },
  {
    id: "building-gabelli",
    name: "Gabelli School of Business",
    shortName: "GABELLI",
    position: { x: 8, y: 0, z: 1 },
    size: [4.6, 2.4, 4.6],
    campus: "rose_hill",
    color: "#704048",
  },
  {
    id: "building-mcginnley",
    name: "McGinley Center",
    shortName: "MCGINLEY",
    position: { x: 2.5, y: 0, z: 8 },
    size: [5.6, 2.2, 3.4],
    campus: "rose_hill",
    color: "#633640",
  },
  {
    id: "building-lincoln",
    name: "Lowenstein Center",
    shortName: "LOWENSTEIN",
    position: { x: 0, y: 0, z: 0 },
    size: [8, 5.5, 5],
    campus: "lincoln_center",
    color: "#5b2634",
  },
];

export const PORTALS: LearningPortal[] = [
  {
    id: "portal-systems-debugging",
    buildingId: "building-keating",
    title: "Systems Debugging Sprint",
    description: "Repair a binary-search service, pass the edge cases, and explain the loop invariant.",
    category: "infra",
    replitTemplateUrl: "https://replit.com/new/python3",
    estimatedMinutes: 25,
    skills: ["Python", "Testing", "Algorithms"],
    difficulty: "Intermediate",
  },
  {
    id: "portal-frontend-events",
    buildingId: "building-walsh",
    title: "Live Events Frontend",
    description: "Build a responsive event board with filters, optimistic RSVP state, and accessible UI.",
    category: "frontend",
    replitTemplateUrl: "https://replit.com/new/react-ts",
    estimatedMinutes: 35,
    skills: ["React", "TypeScript", "UX"],
    difficulty: "Starter",
  },
  {
    id: "portal-data-analytics",
    buildingId: "building-gabelli",
    title: "Campus Analytics Lab",
    description: "Explore student activity data and turn it into a clear, decision-ready dashboard.",
    category: "data",
    replitTemplateUrl: "https://replit.com/new/python3",
    estimatedMinutes: 40,
    skills: ["SQL", "pandas", "Analytics"],
    difficulty: "Intermediate",
  },
  {
    id: "portal-startup-pitch",
    buildingId: "building-mcginnley",
    title: "Ship a Campus Startup",
    description: "Turn a campus pain point into a tiny product, landing page, and testable pitch.",
    category: "startup",
    replitTemplateUrl: "https://replit.com/new/html",
    estimatedMinutes: 30,
    skills: ["Product", "Design", "Validation"],
    difficulty: "Starter",
  },
  {
    id: "portal-lincoln-creative-code",
    buildingId: "building-lincoln",
    title: "Creative Code Studio",
    description: "Build an interactive story that combines campus reporting, motion, and a small public data source.",
    category: "frontend",
    replitTemplateUrl: "https://replit.com/new/react-ts",
    estimatedMinutes: 45,
    skills: ["React", "Motion", "Storytelling"],
    difficulty: "Intermediate",
  },
];

const demoPlayers: Player[] = [
  {
    id: "player-ava",
    roomId: DEMO_ROOM.id,
    displayName: "Ava",
    avatarColor: "#38bdf8",
    position: { x: -5.2, y: 0, z: 3.5 },
    rotationY: 1.2,
    activeQuestId: "quest-ava",
    connected: true,
  },
  {
    id: "player-leo",
    roomId: DEMO_ROOM.id,
    displayName: "Leo",
    avatarColor: "#f97316",
    position: { x: 5.8, y: 0, z: 4.1 },
    rotationY: -0.8,
    activeQuestId: null,
    connected: true,
  },
  {
    id: "player-mina",
    roomId: DEMO_ROOM.id,
    displayName: "Mina",
    avatarColor: "#a78bfa",
    position: { x: 2.7, y: 0, z: -2.8 },
    rotationY: 2.4,
    activeQuestId: "quest-mina",
    connected: true,
  },
];

const demoEvents: CampusEvent[] = [
  {
    id: "event-study-sprint",
    roomId: DEMO_ROOM.id,
    creatorPlayerId: "player-ava",
    title: "Algorithms Study Sprint",
    description: "Thirty focused minutes, then compare solutions. Meet by Walsh Library.",
    buildingId: "building-walsh",
    position: { x: -5.8, y: 0, z: 0.8 },
    startTime: Date.now() + 10 * 60 * 1000,
    endTime: null,
    tags: ["CS", "Study", "Open"],
  },
  {
    id: "event-founder-night",
    roomId: DEMO_ROOM.id,
    creatorPlayerId: "player-leo",
    title: "Founder Lightning Pitches",
    description: "Pitch one campus problem in sixty seconds. Teammates welcome.",
    buildingId: "building-mcginnley",
    position: { x: 5.8, y: 0, z: 7 },
    startTime: Date.now() + 25 * 60 * 1000,
    endTime: null,
    tags: ["Startup", "Social"],
  },
];

const demoQuests: PlayerQuest[] = [
  {
    id: "quest-ava",
    playerId: "player-ava",
    portalId: "portal-frontend-events",
    status: "in_progress",
    startedAt: Date.now() - 12 * 60 * 1000,
    completedAt: null,
    lastStatusCheckAt: Date.now(),
  },
  {
    id: "quest-mina",
    playerId: "player-mina",
    portalId: "portal-data-analytics",
    status: "in_progress",
    startedAt: Date.now() - 8 * 60 * 1000,
    completedAt: null,
    lastStatusCheckAt: Date.now(),
  },
];

export function createInitialState(): RealtimeState {
  return {
    rooms: [DEMO_ROOM],
    players: demoPlayers,
    events: demoEvents,
    eventRsvps: [
      { id: "rsvp-ava", eventId: "event-study-sprint", playerId: "player-ava", status: "going" },
      { id: "rsvp-mina", eventId: "event-study-sprint", playerId: "player-mina", status: "interested" },
    ],
    buildings: BUILDINGS,
    portals: PORTALS,
    playerQuests: demoQuests,
  };
}
