import { lazy, Suspense, useEffect, useState } from "react";

import { Landing } from "./components/Landing";
import { realtimeStore } from "./lib/realtimeStore";

const SESSION_KEY = "fordhamverse-player-id";
const CampusView = lazy(async () => {
  const module = await import("./components/CampusView");
  return { default: module.CampusView };
});

export default function App() {
  const [playerId, setPlayerId] = useState<string | null>(() => window.sessionStorage.getItem(SESSION_KEY));

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    void Promise.resolve(realtimeStore.reconnectPlayer(playerId)).then((player) => {
      if (!cancelled && !player) {
        window.sessionStorage.removeItem(SESSION_KEY);
        setPlayerId(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  if (!playerId) {
    return (
      <Landing
        onJoin={async (code, displayName) => {
          const player = await realtimeStore.joinRoom(code, displayName);
          window.sessionStorage.setItem(SESSION_KEY, player.id);
          setPlayerId(player.id);
        }}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-slate-950 text-sm font-semibold text-emerald-300">
          Loading FordhamVerse...
        </main>
      }
    >
      <CampusView
        playerId={playerId}
        onLeave={() => {
          window.sessionStorage.removeItem(SESSION_KEY);
          setPlayerId(null);
        }}
      />
    </Suspense>
  );
}
