import { FormEvent, useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { askCampusTa } from "../lib/api";
import { realtimeStore } from "../lib/realtimeStore";
import type { Campus, CampusEvent, ChatMessage, LearningPortal, PortalCategory } from "../lib/types";
import { CampusScene } from "./CampusScene";

interface CampusViewProps {
  playerId: string;
  onLeave: () => void;
}

const CATEGORY_COLORS: Record<PortalCategory, string> = {
  ml: "#a78bfa",
  frontend: "#38bdf8",
  infra: "#f97316",
  startup: "#facc15",
  data: "#34d399",
  general: "#94a3b8",
};

function timeLabel(timestamp: number): string {
  const minutes = Math.max(0, Math.round((timestamp - Date.now()) / 60000));
  if (minutes <= 0) return "Happening now";
  return `Starts in ${minutes} min`;
}

function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
    </div>
  );
}

function EventItem({
  event,
  rsvpCount,
  onOpen,
}: {
  event: CampusEvent;
  rsvpCount: number;
  onOpen: () => void;
}) {
  return (
    <button onClick={onOpen} className="list-card group w-full text-left">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white transition group-hover:text-rose-200">{event.title}</p>
          <p className="mt-1 text-xs text-rose-300">{timeLabel(event.startTime)}</p>
        </div>
        <div className="event-dot mt-1.5" />
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">{event.description}</p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span>{event.tags.slice(0, 2).join(" · ")}</span>
        <span>{rsvpCount} joined</span>
      </div>
    </button>
  );
}

function PortalItem({
  portal,
  active,
  onOpen,
}: {
  portal: LearningPortal;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button onClick={onOpen} className="list-card group w-full text-left">
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: CATEGORY_COLORS[portal.category],
            borderColor: `${CATEGORY_COLORS[portal.category]}40`,
            background: `${CATEGORY_COLORS[portal.category]}12`,
          }}
        >
          {portal.category.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-white">{portal.title}</p>
            {active && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-emerald-300">Active</span>}
          </div>
          <p className="mt-1 text-xs text-slate-500">{portal.difficulty} · {portal.estimatedMinutes} min</p>
        </div>
      </div>
    </button>
  );
}

function CreateEventModal({
  playerId,
  buildings,
  onClose,
}: {
  playerId: string;
  buildings: ReturnType<typeof realtimeStore.getSnapshot>["buildings"];
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [buildingId, setBuildingId] = useState(buildings[0]?.id ?? "");
  const [tags, setTags] = useState("Study, Open");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await realtimeStore.createEvent({
        playerId,
        title,
        description,
        buildingId,
        tags: tags.split(","),
      });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create event.");
    }
  }

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.form
        onSubmit={submit}
        className="modal-card max-w-lg"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <PanelTitle eyebrow="Live events" title="Drop an event on campus" />
          <button type="button" onClick={onClose} className="icon-button" aria-label="Close">×</button>
        </div>
        <div className="mt-7 space-y-4">
          <label className="block">
            <span className="form-label">Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="form-input" placeholder="Study sprint now" autoFocus />
          </label>
          <label className="block">
            <span className="form-label">Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="form-input min-h-24 resize-none" placeholder="What should people know?" />
          </label>
          <label className="block">
            <span className="form-label">Building</span>
            <select value={buildingId} onChange={(event) => setBuildingId(event.target.value)} className="form-input">
              {buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="form-label">Tags, comma separated</span>
            <input value={tags} onChange={(event) => setTags(event.target.value)} className="form-input" />
          </label>
          {error && <p className="text-sm text-rose-300">{error}</p>}
        </div>
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="secondary-button">Cancel</button>
          <button type="submit" className="primary-button">Publish event</button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function PortalModal({
  portal,
  activeQuestId,
  onClose,
  onLaunch,
  onComplete,
}: {
  portal: LearningPortal;
  activeQuestId: string | null;
  onClose: () => void;
  onLaunch: () => void;
  onComplete: () => void;
}) {
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.div
        className="modal-card max-w-xl overflow-hidden"
        initial={{ opacity: 0, y: 22, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="portal-hero">
          <div className="portal-orbit" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                {portal.category} quest
              </span>
              <h2 className="mt-5 max-w-md text-3xl font-semibold tracking-tight text-white">{portal.title}</h2>
            </div>
            <button onClick={onClose} className="icon-button" aria-label="Close">×</button>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-sm leading-7 text-slate-300">{portal.description}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="detail-cell"><span>Difficulty</span><strong>{portal.difficulty}</strong></div>
            <div className="detail-cell"><span>Estimated</span><strong>{portal.estimatedMinutes} min</strong></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {portal.skills.map((skill) => <span key={skill} className="tag">{skill}</span>)}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={onLaunch} className="primary-button flex-1">Launch on Replit <span>↗</span></button>
            {activeQuestId && <button onClick={onComplete} className="secondary-button">Mark complete</button>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EventModal({
  event,
  rsvpStatus,
  rsvpCount,
  onClose,
  onRsvp,
}: {
  event: CampusEvent;
  rsvpStatus?: "going" | "interested";
  rsvpCount: number;
  onClose: () => void;
  onRsvp: (status: "going" | "interested") => void;
}) {
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.div className="modal-card max-w-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">{timeLabel(event.startTime)}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">{event.title}</h2>
          </div>
          <button onClick={onClose} className="icon-button" aria-label="Close">×</button>
        </div>
        <p className="mt-6 text-sm leading-7 text-slate-300">{event.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {event.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
        </div>
        <p className="mt-6 text-xs text-slate-500">{rsvpCount} students joined</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={() => onRsvp("going")} className={rsvpStatus === "going" ? "primary-button" : "secondary-button"}>Going</button>
          <button onClick={() => onRsvp("interested")} className={rsvpStatus === "interested" ? "primary-button" : "secondary-button"}>Interested</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TaDrawer({
  playerId,
  portal,
  onClose,
}: {
  playerId: string;
  portal: LearningPortal;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "assistant",
      text: `I am grounded in ${portal.title}. Tell me what is failing and I will give one concrete next step.`,
    },
  ]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleaned = question.trim();
    if (!cleaned || loading) return;
    setQuestion("");
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: cleaned }]);
    setLoading(true);
    const answer = await askCampusTa({ playerId, portalId: portal.id, question: cleaned });
    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: answer.hint,
        tags: answer.conceptTags,
      },
    ]);
    setLoading(false);
  }

  return (
    <motion.aside
      className="ta-drawer"
      initial={{ x: "105%" }}
      animate={{ x: 0 }}
      exit={{ x: "105%" }}
      transition={{ type: "spring", damping: 28, stiffness: 260 }}
    >
      <header className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="ta-avatar">TA</div>
          <div>
            <p className="text-sm font-semibold text-white">Campus TA</p>
            <p className="text-[11px] text-emerald-400">Code context connected</p>
          </div>
        </div>
        <button onClick={onClose} className="icon-button" aria-label="Close TA">×</button>
      </header>
      <div className="border-b border-white/5 bg-white/[0.015] px-5 py-3">
        <p className="truncate text-[11px] text-slate-500">Context: <span className="text-slate-300">{portal.title}</span></p>
      </div>
      <div className="ta-messages">
        {messages.map((message) => (
          <div key={message.id} className={message.role === "user" ? "message message-user" : "message message-assistant"}>
            <p>{message.text}</p>
            {message.tags && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {message.tags.map((tag) => <span key={tag} className="message-tag">{tag}</span>)}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="message message-assistant text-slate-500">Searching quest code...</div>}
      </div>
      <form onSubmit={submit} className="border-t border-white/5 p-4">
        <div className="ta-input-wrap">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={2}
            placeholder="Ask about code, tests, or next quest..."
          />
          <button type="submit" disabled={loading || !question.trim()} aria-label="Send message">↑</button>
        </div>
      </form>
    </motion.aside>
  );
}

export function CampusView({ playerId, onLeave }: CampusViewProps) {
  const state = useSyncExternalStore(realtimeStore.subscribe, realtimeStore.getSnapshot);
  const player = state.players.find((item) => item.id === playerId);
  const room = state.rooms.find((item) => item.id === player?.roomId);
  const [campus, setCampus] = useState<Campus>("rose_hill");
  const [activeTab, setActiveTab] = useState<"events" | "learning">("events");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hostMode, setHostMode] = useState(false);
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [selectedPortalId, setSelectedPortalId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [nearPortalId, setNearPortalId] = useState<string | null>(null);
  const [nearEventId, setNearEventId] = useState<string | null>(null);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [taOpen, setTaOpen] = useState(false);

  const buildings = useMemo(() => state.buildings.filter((building) => building.campus === campus), [state.buildings, campus]);
  const buildingIds = useMemo(() => new Set(buildings.map((building) => building.id)), [buildings]);
  const portals = useMemo(() => state.portals.filter((portal) => buildingIds.has(portal.buildingId)), [state.portals, buildingIds]);
  const events = useMemo(() => state.events.filter((event) => buildingIds.has(event.buildingId)), [state.events, buildingIds]);
  const stats = room ? realtimeStore.learningStats(room.id) : [];

  const selectedPortal = state.portals.find((portal) => portal.id === selectedPortalId) ?? null;
  const selectedEvent = state.events.find((event) => event.id === selectedEventId) ?? null;
  const nearPortal = state.portals.find((portal) => portal.id === nearPortalId) ?? null;
  const nearEvent = state.events.find((event) => event.id === nearEventId) ?? null;
  const activeQuest = state.playerQuests.find((quest) => quest.id === player?.activeQuestId) ?? null;
  const taPortal = selectedPortal ?? state.portals.find((portal) => portal.id === activeQuest?.portalId) ?? portals[0] ?? state.portals[0];

  const onProximity = useCallback((portalId: string | null, eventId: string | null) => {
    setNearPortalId(portalId);
    setNearEventId(eventId);
  }, []);

  if (!player || !room) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <button onClick={onLeave} className="primary-button">Return to join screen</button>
      </main>
    );
  }

  function rsvpCount(eventId: string): number {
    return state.eventRsvps.filter((rsvp) => rsvp.eventId === eventId).length;
  }

  function handleLeave() {
    realtimeStore.updateConnection(playerId, false);
    onLeave();
  }

  function launchPortal(portal: LearningPortal) {
    window.open(portal.replitTemplateUrl, "_blank", "noopener,noreferrer");
    void realtimeStore.launchPortal(playerId, portal.id);
  }

  const categoryTotals = stats.reduce<Record<string, number>>((accumulator, stat) => {
    for (const [category, count] of Object.entries(stat.categoryCounts)) {
      accumulator[category] = (accumulator[category] ?? 0) + (count ?? 0);
    }
    return accumulator;
  }, {});

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0">
        <CampusScene
          buildings={buildings}
          portals={portals}
          events={events}
          players={state.players.filter((item) => item.roomId === room.id)}
          currentPlayer={player}
          stats={stats}
          hostMode={hostMode}
          heatmapEnabled={heatmapEnabled}
          onMove={(position, rotationY) => realtimeStore.updatePlayerPose(playerId, position, rotationY)}
          onProximity={onProximity}
          onSelectPortal={setSelectedPortalId}
          onSelectEvent={setSelectedEventId}
        />
      </div>

      <div className="scene-vignette pointer-events-none absolute inset-0" />

      <div className="hud-layer">
        <header className="topbar hud-interactive">
          <div className="flex items-center gap-3">
            <div className="brand-mark brand-mark-small">FV</div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold tracking-[0.16em] text-white">FORDHAMVERSE</p>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {state.players.filter((item) => item.roomId === room.id && item.connected).length} online
              </div>
            </div>
          </div>

          <div className="campus-toggle">
            <button className={campus === "rose_hill" ? "active" : ""} onClick={() => setCampus("rose_hill")}>Rose Hill</button>
            <button className={campus === "lincoln_center" ? "active" : ""} onClick={() => setCampus("lincoln_center")}>Lincoln</button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setHostMode((value) => !value)} className={hostMode ? "topbar-button topbar-button-active" : "topbar-button"}>
              {hostMode ? "Host view" : "Player view"}
            </button>
            <div className="room-code hidden md:flex"><span>ROOM</span><strong>{room.code}</strong></div>
            <button onClick={handleLeave} className="icon-button" aria-label="Leave room">×</button>
          </div>
        </header>

        <AnimatePresence>
          {hostMode && (
            <motion.section
              className="host-panel hud-interactive"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
            >
              <div className="flex items-center justify-between">
                <PanelTitle eyebrow="Instructor view" title="Learning pulse" />
                <button
                  onClick={() => setHeatmapEnabled((value) => !value)}
                  className={heatmapEnabled ? "toggle-button toggle-button-active" : "toggle-button"}
                >
                  Heatmap
                </button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="host-metric"><strong>{state.playerQuests.filter((quest) => quest.status === "in_progress").length}</strong><span>active quests</span></div>
                <div className="host-metric"><strong>{events.length}</strong><span>live events</span></div>
              </div>
              <div className="mt-5">
                <p className="panel-label">Categories</p>
                <div className="mt-3 space-y-2">
                  {Object.entries(categoryTotals).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-slate-400">{category}</span>
                      <span className="font-semibold text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <p className="panel-label">Recent concepts</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["off_by_one", "react_state", "sql_joins"].map((tag) => <span key={tag} className="message-tag">{tag}</span>)}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <motion.aside
          className="right-panel hud-interactive"
          animate={{ x: sidebarOpen ? 0 : "calc(100% + 24px)" }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
        >
          <button className="panel-collapse" onClick={() => setSidebarOpen((value) => !value)} aria-label="Toggle sidebar">
            {sidebarOpen ? "›" : "‹"}
          </button>
          <div className="panel-tabs">
            <button className={activeTab === "events" ? "active" : ""} onClick={() => setActiveTab("events")}>Events <span>{events.length}</span></button>
            <button className={activeTab === "learning" ? "active" : ""} onClick={() => setActiveTab("learning")}>Learning <span>{portals.length}</span></button>
          </div>
          <div className="panel-content">
            {activeTab === "events" ? (
              <>
                <div className="mb-5 flex items-end justify-between">
                  <PanelTitle eyebrow="Around you" title="Happening now" />
                  <button onClick={() => setCreateEventOpen(true)} className="small-action">+ Add</button>
                </div>
                <div className="space-y-3">
                  {events.map((event) => <EventItem key={event.id} event={event} rsvpCount={rsvpCount(event.id)} onOpen={() => setSelectedEventId(event.id)} />)}
                  {events.length === 0 && <p className="empty-state">No events on this campus yet. Drop the first one.</p>}
                </div>
              </>
            ) : (
              <>
                <div className="mb-5">
                  <PanelTitle eyebrow="Replit quests" title="Learn by building" />
                  <p className="mt-2 text-xs leading-5 text-slate-500">Walk near a green portal or launch directly.</p>
                </div>
                <div className="space-y-3">
                  {portals.map((portal) => (
                    <PortalItem
                      key={portal.id}
                      portal={portal}
                      active={state.playerQuests.some((quest) => quest.playerId === playerId && quest.portalId === portal.id && quest.status === "in_progress")}
                      onOpen={() => setSelectedPortalId(portal.id)}
                    />
                  ))}
                  {portals.length === 0 && <p className="empty-state">Lincoln Center quests arrive in next cohort.</p>}
                </div>
              </>
            )}
          </div>
        </motion.aside>

        {!sidebarOpen && <button className="sidebar-reopen hud-interactive" onClick={() => setSidebarOpen(true)}>Open panel</button>}

        <AnimatePresence>
          {(nearPortal || nearEvent) && !selectedPortal && !selectedEvent && (
            <motion.div
              className="proximity-card hud-interactive"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
            >
              <span className={nearPortal ? "proximity-icon proximity-icon-portal" : "proximity-icon proximity-icon-event"}>
                {nearPortal ? "Q" : "E"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{nearPortal ? "Learning portal nearby" : "Live event nearby"}</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">{nearPortal?.title ?? nearEvent?.title}</p>
              </div>
              <button onClick={() => nearPortal ? setSelectedPortalId(nearPortal.id) : nearEvent && setSelectedEventId(nearEvent.id)} className="small-action">Open</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="movement-help">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>
          <span><kbd>Space</kbd> Jump</span>
          <span className="hidden sm:inline"><kbd>Shift</kbd> Sprint</span>
        </div>

        {taPortal && (
          <button onClick={() => setTaOpen(true)} className="ta-fab hud-interactive">
            <span className="ta-fab-icon">TA</span>
            <span className="hidden sm:block"><strong>Campus TA</strong><small>Ask about your quest</small></span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {selectedPortal && (
          <PortalModal
            portal={selectedPortal}
            activeQuestId={state.playerQuests.find((quest) => quest.playerId === playerId && quest.portalId === selectedPortal.id && quest.status === "in_progress")?.id ?? null}
            onClose={() => setSelectedPortalId(null)}
            onLaunch={() => launchPortal(selectedPortal)}
            onComplete={() => {
              const quest = state.playerQuests.find((item) => item.playerId === playerId && item.portalId === selectedPortal.id && item.status === "in_progress");
              if (quest) realtimeStore.completeQuest(quest.id);
            }}
          />
        )}
        {selectedEvent && (
          <EventModal
            event={selectedEvent}
            rsvpStatus={state.eventRsvps.find((rsvp) => rsvp.eventId === selectedEvent.id && rsvp.playerId === playerId)?.status}
            rsvpCount={rsvpCount(selectedEvent.id)}
            onClose={() => setSelectedEventId(null)}
            onRsvp={(status) => realtimeStore.rsvpEvent(selectedEvent.id, playerId, status)}
          />
        )}
        {createEventOpen && <CreateEventModal playerId={playerId} buildings={buildings} onClose={() => setCreateEventOpen(false)} />}
        {taOpen && taPortal && <TaDrawer playerId={playerId} portal={taPortal} onClose={() => setTaOpen(false)} />}
      </AnimatePresence>
    </main>
  );
}
