import { motion, AnimatePresence } from "framer-motion";
import { gameStore } from "@/lib/store";
import { EVENTS } from "@/lib/data";

interface EventSidebarProps {
  eventId: string | null;
  onDismiss: () => void;
}

function formatRelativeTime(ts: number): string {
  const diff = ts - Date.now();
  if (diff < 0) return "Started";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `Starts in ${h}h ${m}m`;
  return `Starts in ${m}m`;
}

export function EventSidebar({ eventId, onDismiss }: EventSidebarProps) {
  const event = EVENTS.find((e) => e.id === eventId);

  const handleRsvp = (status: "going" | "interested") => {
    if (!eventId) return;
    gameStore.rsvpEvent(eventId, status);
  };

  const rsvpStatus = eventId ? gameStore.getRsvpStatus(eventId) : null;

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.id}
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          data-testid="event-sidebar"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-80 glass-panel rounded-2xl p-5 space-y-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-red-400 bg-red-400/10 border-red-400/20">
                  Live Event
                </span>
              </div>
              <h3
                className="text-lg font-bold text-foreground leading-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {event.title}
              </h3>
            </div>
            <button
              data-testid="button-dismiss-event"
              onClick={onDismiss}
              className="flex-shrink-0 w-7 h-7 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-lg leading-none transition-all"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {event.description}
          </p>

          {/* Time */}
          <div className="flex items-center gap-2 text-sm text-foreground/70">
            <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{formatRelativeTime(event.startTime)}</span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-foreground/70 border border-border"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-destructive/30 to-transparent" />

          {/* RSVP */}
          {rsvpStatus ? (
            <div
              data-testid="rsvp-status"
              className="flex items-center gap-2 justify-center py-2 rounded-xl bg-primary/10 border border-primary/20"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-semibold text-primary capitalize">
                {rsvpStatus === "going" ? "You're Going" : "You're Interested"}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="button-rsvp-going"
                onClick={() => handleRsvp("going")}
                className="py-2.5 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                Going
              </button>
              <button
                data-testid="button-rsvp-interested"
                onClick={() => handleRsvp("interested")}
                className="py-2.5 rounded-xl text-sm font-semibold text-foreground bg-muted hover:bg-muted/70 active:scale-[0.98] transition-all"
              >
                Interested
              </button>
            </div>
          )}

          <button
            data-testid="button-dismiss-event-bottom"
            onClick={onDismiss}
            className="w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
          >
            Dismiss
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
