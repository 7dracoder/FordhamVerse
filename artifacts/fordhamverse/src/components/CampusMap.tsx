import { motion, AnimatePresence } from "framer-motion";
import campusMapImg from "@assets/image_1780865198795.png";

interface CampusMapProps {
  open: boolean;
  onClose: () => void;
}

export function CampusMap({ open, onClose }: CampusMapProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          data-testid="campus-map-overlay"
          className="absolute inset-0 z-40 flex items-center justify-center p-6"
          style={{ background: "rgba(5,10,20,0.8)", backdropFilter: "blur(6px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="glass-panel rounded-2xl p-4 max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <div>
                  <h3
                    className="text-sm font-bold text-foreground leading-none"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Rose Hill Campus Map
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fordham University · The Bronx, NY
                  </p>
                </div>
              </div>
              <button
                data-testid="button-close-map"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-lg leading-none transition-all"
                aria-label="Close map"
              >
                ×
              </button>
            </div>

            {/* Map image */}
            <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-white">
              <img
                src={campusMapImg}
                alt="Fordham University Rose Hill campus map"
                className="w-full h-auto block"
                data-testid="img-campus-map"
              />
            </div>

            <p className="text-xs text-muted-foreground mt-3 px-1 text-center">
              The FordhamVerse 3D campus is modeled on this official map — explore
              Keating Hall, Edwards Parade, the University Church, and more.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
