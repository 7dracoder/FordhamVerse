import { FormEvent, useState } from "react";
import { motion } from "framer-motion";

interface LandingProps {
  onJoin: (code: string, displayName: string) => void | Promise<void>;
}

export function Landing({ onJoin }: LandingProps) {
  const [code, setCode] = useState("RAMS");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoining(true);
    setError("");
    try {
      await onJoin(code, displayName);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not enter room.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="landing-shell">
      <div className="landing-grid" aria-hidden="true" />
      <div className="landing-glow landing-glow-one" aria-hidden="true" />
      <div className="landing-glow landing-glow-two" aria-hidden="true" />

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 items-center gap-14 px-6 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:px-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="brand-mark">FV</div>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-white">FORDHAMVERSE</p>
              <p className="text-[10px] font-medium tracking-[0.32em] text-emerald-400">LIVE CAMPUS NETWORK</p>
            </div>
          </div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#22c55e]" />
            Rose Hill is live
          </div>

          <h1 className="max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.055em] text-white sm:text-6xl lg:text-[82px]">
            Campus, now
            <span className="block bg-gradient-to-r from-emerald-300 via-emerald-400 to-sky-400 bg-clip-text text-transparent">
              multiplayer.
            </span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">
            Explore Fordham in 3D, find what is happening right now, launch coding quests, and get help from an AI TA that reads the work.
          </p>

          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {[
              ["24", "students online"],
              ["4", "live quests"],
              ["2", "events starting"],
            ].map(([value, label]) => (
              <div key={label} className="metric-card">
                <p className="text-2xl font-semibold text-white">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.6 }}
          className="join-card"
        >
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">Enter world</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Join your campus</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Use demo room code `RAMS`, then move with WASD.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="form-label">Room code</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                className="form-input font-mono uppercase tracking-[0.25em]"
                maxLength={8}
                autoComplete="off"
                aria-label="Room code"
              />
            </label>
            <label className="block">
              <span className="form-label">Display name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="form-input"
                placeholder="Your name"
                maxLength={32}
                autoFocus
                aria-label="Display name"
              />
            </label>

            {error && <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">{error}</p>}

            <button type="submit" className="primary-button w-full" disabled={joining}>
              {joining ? "Connecting..." : "Enter FordhamVerse"}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="mt-7 flex items-center justify-between border-t border-white/5 pt-5 text-xs text-slate-500">
            <span>No install required</span>
            <span>Realtime demo room</span>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
