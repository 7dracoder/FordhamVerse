import { motion, AnimatePresence } from "framer-motion";
import { gameStore } from "@/lib/store";
import { PORTALS, BUILDINGS } from "@/lib/data";
import type { LearningPortal } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  ml: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  frontend: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  infra: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  startup: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  data: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  general: "text-gray-400 bg-gray-400/10 border-gray-400/20",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Starter: "text-primary bg-primary/10 border-primary/20",
  Intermediate: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Advanced: "text-red-400 bg-red-400/10 border-red-400/20",
};

interface QuestSidebarProps {
  portalId: string | null;
  onDismiss: () => void;
}

export function QuestSidebar({ portalId, onDismiss }: QuestSidebarProps) {
  const portal: LearningPortal | undefined = PORTALS.find((p) => p.id === portalId);
  const building = portal ? BUILDINGS.find((b) => b.id === portal.buildingId) : undefined;

  const handleLaunch = () => {
    if (!portal) return;
    gameStore.startQuest(portal.id);
    window.open(portal.replitTemplateUrl, "_blank", "noopener");
  };

  return (
    <AnimatePresence>
      {portal && (
        <motion.div
          key={portal.id}
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          data-testid="quest-sidebar"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-80 glass-panel rounded-2xl p-5 space-y-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${CATEGORY_COLORS[portal.category] ?? CATEGORY_COLORS.general}`}
                >
                  {portal.category}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[portal.difficulty] ?? ""}`}
                >
                  {portal.difficulty}
                </span>
              </div>
              <h3
                className="text-lg font-bold text-foreground leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {portal.title}
              </h3>
              {building && (
                <p className="text-xs text-muted-foreground mt-1">
                  {building.name}
                </p>
              )}
            </div>
            <button
              data-testid="button-dismiss-quest"
              onClick={onDismiss}
              className="flex-shrink-0 w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-lg leading-none transition-all"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {portal.description}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                {portal.estimatedMinutes}
              </p>
              <p className="text-xs text-muted-foreground">minutes</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1.5">Skills</p>
              <div className="flex flex-wrap gap-1">
                {portal.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs px-2 py-0.5 rounded bg-muted/50 text-foreground/70 border border-border"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Portal glow line */}
          <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          {/* Actions */}
          <div className="space-y-2">
            <button
              data-testid="button-launch-quest"
              onClick={handleLaunch}
              className="w-full py-3 rounded-xl font-semibold text-sm text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Launch Quest on Replit
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
            <button
              data-testid="button-dismiss-quest-bottom"
              onClick={onDismiss}
              className="w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
