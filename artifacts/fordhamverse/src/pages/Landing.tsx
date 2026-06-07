import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { gameStore } from "@/lib/store";

const PARTICLE_COUNT = 60;

type Particle = {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
};

const PARTICLE_COLORS = ["#22c55e", "#38bdf8", "#a78bfa", "#f97316"];

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    x: (i * 13.7) % 100,
    y: (i * 7.3) % 100,
    size: 1 + (i % 4),
    speedX: ((i % 5) - 2) * 0.008,
    speedY: -0.02 - (i % 3) * 0.008,
    opacity: 0.2 + (i % 6) * 0.08,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  }));
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>(generateParticles());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.y < -2) p.y = 102;
        if (p.x < -2) p.x = 102;
        if (p.x > 102) p.x = -2;

        ctx.beginPath();
        ctx.arc(
          (p.x / 100) * canvas.width,
          (p.y / 100) * canvas.height,
          p.size,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

export default function Landing() {
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState("RAMS");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const name = displayName.trim();
    const code = roomCode.trim().toUpperCase();

    if (!name) {
      setError("Enter your display name to continue.");
      return;
    }
    if (!code) {
      setError("Enter a room code.");
      return;
    }
    if (code !== "RAMS") {
      setError("Room not found. Try RAMS.");
      return;
    }

    setError(null);
    setLoading(true);
    setTimeout(() => {
      gameStore.joinRoom(name, code);
      setLoading(false);
    }, 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleJoin();
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-background">
      <ParticleCanvas />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,197,94,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          zIndex: 1,
        }}
      />

      {/* Radial glow center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(34,197,94,0.06) 0%, transparent 70%)",
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-2 flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-primary" />
          </div>
          <span
            className="text-sm font-semibold tracking-widest text-muted-foreground uppercase"
            style={{ fontFamily: "var(--font-display)" }}
          >
            FordhamVerse
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-center text-5xl sm:text-6xl font-bold tracking-tight text-foreground leading-none mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your campus.
          <br />
          <span className="text-primary">Your quest.</span>
          <br />
          Your world.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="text-center text-muted-foreground text-base mb-10 max-w-xs"
        >
          Explore Fordham&apos;s 3D campus, join live events, and unlock
          learning quests guided by your AI Campus TA.
        </motion.p>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full glass-panel rounded-2xl p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="displayName"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"
            >
              Display Name
            </label>
            <input
              id="displayName"
              data-testid="input-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Your name in the Verse"
              maxLength={32}
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="roomCode"
              className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5"
            >
              Room Code
            </label>
            <input
              id="roomCode"
              data-testid="input-room-code"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="RAMS"
              maxLength={8}
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all font-mono tracking-widest"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Default room: <span className="text-primary font-mono font-semibold">RAMS</span>
            </p>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-destructive text-sm"
            >
              {error}
            </motion.p>
          )}

          <button
            data-testid="button-enter-verse"
            onClick={handleJoin}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Entering the Verse...
              </>
            ) : (
              "Enter the Verse"
            )}
          </button>
        </motion.div>

        {/* Bottom status bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span>Rose Hill Campus — Live</span>
          <span className="mx-2 text-border">|</span>
          <span>Powered by Replit</span>
        </motion.div>
      </div>
    </div>
  );
}
