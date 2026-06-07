import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { DEMO_ROOM } from "@/lib/data";

export function RoomCodeBadge() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const base = import.meta.env.BASE_URL || "/";
    return `${window.location.origin}${base}?room=${DEMO_ROOM.code}`;
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span
      className="relative inline-flex pointer-events-auto"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        data-testid="button-room-qr"
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-primary/80 hover:text-primary underline decoration-dotted underline-offset-2 cursor-pointer transition-colors"
      >
        {DEMO_ROOM.code}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            data-testid="popover-room-qr"
            className="absolute bottom-full left-0 mb-3 z-30 w-56 glass-panel rounded-2xl p-4 flex flex-col items-center gap-3"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Scan to join
            </p>
            <div className="rounded-xl bg-white p-2.5">
              <QRCodeSVG
                value={joinUrl}
                size={140}
                level="M"
                bgColor="#ffffff"
                fgColor="#0a0f0d"
              />
            </div>
            <p className="text-center text-xs text-muted-foreground leading-snug">
              Room{" "}
              <span className="font-mono text-primary font-semibold">
                {DEMO_ROOM.code}
              </span>
              {" "}— point a phone camera here.
            </p>
            <button
              type="button"
              onClick={copyLink}
              data-testid="button-copy-join-link"
              className="w-full py-2 rounded-lg text-xs font-semibold text-foreground bg-white/5 hover:bg-white/10 border border-border transition-colors"
            >
              {copied ? "Link copied" : "Copy invite link"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
