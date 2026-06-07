import { useEffect, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronsUp,
  Zap,
} from "lucide-react";
import {
  resetTouchControls,
  setTouchControl,
  type TouchControlKey,
} from "@/lib/touchControls";

/**
 * On-screen movement controls for touch devices (e.g. a phone opened from the
 * room QR code). Mirrors the keyboard controls by mutating the shared
 * `touchControls` singleton on press/release.
 */
function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(mq.matches || "ontouchstart" in window);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return isTouch;
}

function HoldButton({
  control,
  label,
  className,
  children,
}: {
  control: TouchControlKey;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const press = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setTouchControl(control, true);
  };
  const release = (e: React.PointerEvent) => {
    e.preventDefault();
    setTouchControl(control, false);
  };
  return (
    <button
      type="button"
      aria-label={label}
      data-testid={`mobile-${control}`}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onLostPointerCapture={() => setTouchControl(control, false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex items-center justify-center rounded-2xl glass-panel text-foreground/90 active:bg-primary/30 active:text-primary active:scale-95 transition select-none touch-none ${className ?? ""}`}
      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
    >
      {children}
    </button>
  );
}

export function MobileControls() {
  const isTouch = useIsTouchDevice();

  useEffect(() => {
    const clear = () => resetTouchControls();
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      resetTouchControls();
    };
  }, []);

  if (!isTouch) return null;

  return (
    <div className="absolute bottom-6 right-4 z-30 flex items-end gap-4 pointer-events-auto select-none">
      {/* Jump + Sprint stack */}
      <div className="flex flex-col gap-3">
        <HoldButton control="sprint" label="Sprint" className="w-14 h-14">
          <Zap className="w-6 h-6" />
        </HoldButton>
        <HoldButton control="jump" label="Jump" className="w-16 h-16">
          <ChevronsUp className="w-7 h-7" />
        </HoldButton>
      </div>

      {/* Directional pad */}
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
        <span />
        <HoldButton control="forward" label="Move forward" className="w-14 h-14">
          <ArrowUp className="w-6 h-6" />
        </HoldButton>
        <span />
        <HoldButton control="left" label="Move left" className="w-14 h-14">
          <ArrowLeft className="w-6 h-6" />
        </HoldButton>
        <span />
        <HoldButton control="right" label="Move right" className="w-14 h-14">
          <ArrowRight className="w-6 h-6" />
        </HoldButton>
        <span />
        <HoldButton control="back" label="Move back" className="w-14 h-14">
          <ArrowDown className="w-6 h-6" />
        </HoldButton>
        <span />
      </div>
    </div>
  );
}
