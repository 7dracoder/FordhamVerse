import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { PORTALS } from "@/lib/data";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const INITIAL_MESSAGE: Message = {
  id: "init",
  role: "assistant",
  text: "Hey! I'm your AI Campus TA. I can help you with quests, coding questions, or navigate FordhamVerse. What are you working on?",
};

const MOCK_RESPONSES: Record<string, string> = {
  default:
    "Great question! As your Campus TA, I'd suggest exploring the Learning Portals near each building. Try the CS Quest at Freeman Hall — it's a great starting point for building real projects.",
  quest:
    "For your current quest, focus on breaking the problem into smaller pieces. Start by reading the README, then identify the failing tests. Work through them one at a time — don't try to fix everything at once.",
  ml: "Machine learning can be tricky! Make sure your training data is clean before anything else. Use pandas to inspect it with `.info()` and `.describe()`. What's the specific error you're seeing?",
  frontend:
    "For frontend challenges, start with the HTML structure before adding CSS. Then layer in JavaScript interactivity. Tailwind makes this much faster — use `flex`, `grid`, and spacing utilities first.",
  stuck:
    "It happens to everyone! Try rubber duck debugging — explain the problem out loud step by step. Also, check the browser console for errors and look at what the expected vs actual output is.",
  help: "I'm here to help! You can ask me about: your current quest, coding concepts, Fordham buildings and portals, or general programming questions.",
};

function getMockResponse(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("quest") || lower.includes("launch")) return MOCK_RESPONSES.quest;
  if (lower.includes("ml") || lower.includes("machine learning") || lower.includes("neural"))
    return MOCK_RESPONSES.ml;
  if (lower.includes("frontend") || lower.includes("css") || lower.includes("html"))
    return MOCK_RESPONSES.frontend;
  if (lower.includes("stuck") || lower.includes("help") || lower.includes("error"))
    return MOCK_RESPONSES.stuck;
  if (lower.includes("help") || lower.includes("what can")) return MOCK_RESPONSES.help;
  return MOCK_RESPONSES.default;
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const state = useGameStore();

  const pid = state.myPlayerId;
  const player = pid ? state.players[pid] : null;
  const activeQuestId = player?.activeQuestId ?? null;
  const activeQuest = activeQuestId ? state.quests[activeQuestId] : null;
  const activePortal = activeQuest ? PORTALS.find((p) => p.id === activeQuest.portalId) : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || typing) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const response = getMockResponse(text);
      const contextPrefix = activePortal
        ? `Regarding your "${activePortal.title}" quest — `
        : "";
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: contextPrefix + response,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setTyping(false);
    }, 1200 + Math.random() * 600);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        data-testid="button-ai-assistant"
        onClick={() => setOpen((v) => !v)}
        className="absolute bottom-6 right-4 z-30 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        title="AI Campus TA"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.699-1.425 2.382l-1.944-.332M5 14.5l-1.402 1.401c-1 1-.03 2.7 1.425 2.382l1.944-.333m0 0a3.375 3.375 0 006.064 1.46M4.961 18.15a3.375 3.375 0 006.439 1.181"
          />
        </svg>
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full animate-ping bg-primary/30 pointer-events-none" />
      </motion.button>

      {/* Chat drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            data-testid="ai-chat-drawer"
            className="absolute bottom-20 right-4 z-30 w-80 glass-panel rounded-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "60vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  AI Campus TA
                </span>
                {activePortal && (
                  <span className="text-xs text-muted-foreground truncate max-w-24">
                    · {activePortal.title}
                  </span>
                )}
              </div>
              <button
                data-testid="button-close-ai"
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-sm leading-none transition-all"
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  data-testid={`message-${msg.role}`}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted/50 text-foreground rounded-bl-sm border border-white/5"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 rounded-xl rounded-bl-sm px-4 py-3 border border-white/5">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  data-testid="input-ai-message"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your Campus TA..."
                  className="flex-1 bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-all"
                  disabled={typing}
                />
                <button
                  data-testid="button-send-ai"
                  onClick={sendMessage}
                  disabled={!input.trim() || typing}
                  className="w-9 h-9 flex-shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 transition-all active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
