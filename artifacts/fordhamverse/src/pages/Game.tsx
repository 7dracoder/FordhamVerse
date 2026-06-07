import { useState } from "react";
import { useGameStore, gameStore } from "@/lib/store";
import { CampusScene } from "@/components/CampusScene";
import { TopBar } from "@/components/TopBar";
import { GameHUD } from "@/components/GameHUD";
import { MobileControls } from "@/components/MobileControls";
import { QuestSidebar } from "@/components/QuestSidebar";
import { EventSidebar } from "@/components/EventSidebar";
import { AIAssistant } from "@/components/AIAssistant";
import { CampusMap } from "@/components/CampusMap";

export default function Game() {
  const state = useGameStore();
  const [showMap, setShowMap] = useState(false);
  const [nearPortalId, setNearPortalId] = useState<string | null>(null);
  const [nearEventId, setNearEventId] = useState<string | null>(null);
  const [selectedPortalId, setSelectedPortalId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const pid = state.myPlayerId;
  const myPlayer = pid ? state.players[pid] : null;
  const otherPlayers = Object.values(state.players).filter((p) => p.id !== pid);

  const handleProximity = (portalId: string | null, eventId: string | null) => {
    setNearPortalId(portalId);
    setNearEventId(eventId);
    // Auto-show sidebar when walking near a portal or event
    if (portalId && portalId !== selectedPortalId) {
      setSelectedPortalId(portalId);
      setSelectedEventId(null);
    }
    if (eventId && eventId !== selectedEventId) {
      setSelectedEventId(eventId);
      setSelectedPortalId(null);
    }
    // Hide sidebar when walking away
    if (!portalId && selectedPortalId) {
      // Keep it open so user can interact — only close via dismiss
    }
    if (!eventId && selectedEventId) {
      // Same
    }
  };

  const handleLeave = () => {
    gameStore.leaveRoom();
  };

  const handleSelectPortal = (id: string) => {
    setSelectedPortalId(id);
    setSelectedEventId(null);
  };

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
    setSelectedPortalId(null);
  };

  const handleDismissPortal = () => {
    setSelectedPortalId(null);
  };

  const handleDismissEvent = () => {
    setSelectedEventId(null);
  };

  if (!myPlayer) return null;

  return (
    <div
      data-testid="game-container"
      className="relative w-full h-screen overflow-hidden bg-background"
    >
      {/* 3D Canvas — fills entire screen */}
      <div className="absolute inset-0">
        <CampusScene
          myPlayer={myPlayer}
          otherPlayers={otherPlayers}
          heatmap={state.heatmapMode}
          onProximity={handleProximity}
          onSelectPortal={handleSelectPortal}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      {/* UI overlays */}
      <TopBar
        onLeave={handleLeave}
        onToggleMap={() => setShowMap((v) => !v)}
        mapOpen={showMap}
      />
      <GameHUD />
      <MobileControls />

      {/* Real Rose Hill campus map overlay */}
      <CampusMap open={showMap} onClose={() => setShowMap(false)} />

      {/* Quest sidebar — right side, slides in */}
      <QuestSidebar
        portalId={selectedPortalId}
        onDismiss={handleDismissPortal}
      />

      {/* Event sidebar — right side, slides in */}
      {!selectedPortalId && (
        <EventSidebar
          eventId={selectedEventId}
          onDismiss={handleDismissEvent}
        />
      )}

      {/* AI Assistant — bottom right */}
      <AIAssistant />

      {/* Proximity hint — shows when near portal/event but sidebar not open */}
      {nearPortalId && !selectedPortalId && (
        <div
          data-testid="proximity-hint-portal"
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        >
          <div className="glass-panel rounded-full px-5 py-2.5 text-sm text-primary font-semibold animate-pulse">
            Press E or click the portal to open quest
          </div>
        </div>
      )}
      {nearEventId && !selectedEventId && !selectedPortalId && (
        <div
          data-testid="proximity-hint-event"
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        >
          <div className="glass-panel rounded-full px-5 py-2.5 text-sm text-red-400 font-semibold animate-pulse">
            Press E or click to view live event
          </div>
        </div>
      )}
    </div>
  );
}
