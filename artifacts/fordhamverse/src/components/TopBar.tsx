import { motion } from "framer-motion";
import { useGameStore, gameStore } from "@/lib/store";

interface TopBarProps {
  onLeave: () => void;
  onToggleMap: () => void;
  mapOpen: boolean;
}

export function TopBar({ onLeave, onToggleMap, mapOpen }: TopBarProps) {
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
          data-testid="button-toggle-map"
          onClick={onToggleMap}
          className={`glass-panel rounded-xl px-3 py-2 text-xs font-semibold transition-all flex items-center gap-1.5 ${
            mapOpen ? "text-primary border-primary/40" : "text-muted-foreground"
          }`}
          title="View Rose Hill campus map"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Map
        </button>

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
