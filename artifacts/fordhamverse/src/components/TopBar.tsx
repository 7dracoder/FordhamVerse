import { motion } from "framer-motion";
import { useGameStore, gameStore } from "@/lib/store";

interface TopBarProps {
  onLeave: () => void;
}

export function TopBar({ onLeave }: TopBarProps) {
  const state = useGameStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 pointer-events-none"
    >
      {/* Logo */}
      <div className="pointer-events-auto glass-panel rounded-xl px-4 py-2 flex items-center gap-2.5">
        <div className="w-5 h-5 rounded bg-primary/20 border border-primary/40 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-primary" />
        </div>
        <span
          className="text-sm font-bold tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          FordhamVerse
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Live
        </span>
      </div>

      {/* Right controls */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          data-testid="button-toggle-heatmap"
          onClick={() => gameStore.toggleHeatmap()}
          className={`glass-panel rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
            state.heatmapMode
              ? "text-primary border-primary/40"
              : "text-muted-foreground"
          }`}
          title="Toggle learning heatmap"
        >
          {state.heatmapMode ? "Heatmap On" : "Heatmap"}
        </button>

        <button
          data-testid="button-leave-game"
          onClick={onLeave}
          className="glass-panel rounded-xl px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-all"
        >
          Leave
        </button>
      </div>
    </motion.div>
  );
}
