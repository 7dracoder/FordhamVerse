import { useGameStore } from "@/lib/store";
import Landing from "@/pages/Landing";
import Game from "@/pages/Game";

export default function App() {
  const state = useGameStore();

  if (!state.myPlayerId) {
    return <Landing />;
  }

  return <Game />;
}
