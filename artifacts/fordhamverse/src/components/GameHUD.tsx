import { motion } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { PORTALS } from "@/lib/data";

export function GameHUD() {
  const state = useGameStore();
  const pid = state.myPlayerId;
  const player = pid ? state.players[pid] : null;

  const activeQuestId = player?.activeQuestId ?? null;
  const activeQuest = activeQuestId ? state.quests[activeQuestId] : null;
  const activePortal = activeQuest
    ? PORTALS.find((p) => p.id === activeQuest.portalId)
    : null;

  if (!player) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="absolute bottom-6 left-4 z-20 space-y-2 pointer-events-none"
    >
      {/* Player info */}
      <div
        data-testid="hud-player-info"
        className="glass-panel rounded-xl px-4 py-2.5 flex items-center gap-2.5"
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white/10"
          style={{ backgroundColor: player.avatarColor }}
        />
        <div>
          <p className="text-sm font-semibold text-foreground leading-none">
            {player.displayName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Room: <span className="font-mono text-primary/80">RAMS</span>
          </p>
        </div>
      </div>

      {/* Active quest */}
      {activePortal && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          data-testid="hud-active-quest"
          className="glass-panel rounded-xl px-4 py-2.5"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
            Active Quest
          </p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-sm font-semibold text-foreground">
              {activePortal.title}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            {activePortal.difficulty} · {activePortal.category}
          </p>
        </motion.div>
      )}

      {/* Controls hint */}
      <div
        data-testid="hud-controls"
        className="glass-panel rounded-xl px-4 py-2.5 space-y-0.5"
      >
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">
          Controls
        </p>
        {[
          ["WASD / Arrows", "Move"],
          ["Space", "Jump"],
          ["Shift", "Sprint"],
        ].map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-6">
            <span className="text-xs font-mono text-foreground/70 bg-white/5 px-1.5 py-0.5 rounded">
              {key}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
