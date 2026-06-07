import type { Building, LearningPortal } from "./types.js";

export const seedBuildings: Building[] = [
  { id: "building-keating", name: "Keating Hall", position: { x: 0, y: 0, z: -6 }, campus: "rose_hill" },
  { id: "building-walsh", name: "Walsh Library", position: { x: -7, y: 0, z: 1 }, campus: "rose_hill" },
  { id: "building-gabelli", name: "Gabelli School", position: { x: 7, y: 0, z: 2 }, campus: "rose_hill" },
  { id: "building-mcginnley", name: "McGinley Center", position: { x: 2, y: 0, z: 8 }, campus: "rose_hill" },
];

export const seedPortals: LearningPortal[] = [
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
    description: "Build a responsive event board with filters, optimistic RSVP state, and accessible UI.",
    category: "frontend",
    replitTemplateUrl: "https://replit.com/new/react-ts",
    estimatedMinutes: 35,
    skills: ["React", "TypeScript", "UX"],
  },
  {
    id: "portal-data-analytics",
    buildingId: "building-gabelli",
    title: "Campus Analytics Lab",
    description: "Explore student activity data and produce a clear, decision-ready dashboard.",
    category: "data",
    replitTemplateUrl: "https://replit.com/new/python3",
    estimatedMinutes: 40,
    skills: ["SQL", "pandas", "analytics"],
  },
  {
    id: "portal-startup-pitch",
    buildingId: "building-mcginnley",
    title: "Ship a Campus Startup",
    description: "Turn a campus pain point into a tiny product, landing page, and testable pitch.",
    category: "startup",
    replitTemplateUrl: "https://replit.com/new/html",
    estimatedMinutes: 30,
    skills: ["product", "design", "validation"],
  },
];
