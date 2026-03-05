// Message list with auto-scroll

import { useAutoScroll } from "../hooks/useAutoScroll"
import { UserMessage } from "./UserMessage"
import { AssistantMessage } from "./AssistantMessage"
import type { UIMessage } from "../hooks/useChat"
import type { Settings } from "../../shared/settings"

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center"
      style={{ color: "#666666" }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#2a2a2a" }}>
        <rect x="4" y="6" width="24" height="18" rx="3" />
        <path d="M10 13h12M10 18h8" />
        <path d="M12 24l4 4 4-4" />
      </svg>
      <div>
        <div className="text-sm mb-1" style={{ color: "#a0a0a0" }}>Ask about this page</div>
        <div className="text-xs">Summarize, analyze, or interact with any web page</div>
      </div>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

interface MessageListProps {
  messages: UIMessage[]
  settings?: Settings
}

export function MessageList({ messages, settings }: MessageListProps) {
  const { scrollRef, anchorRef } = useAutoScroll([messages.length, messages[messages.length - 1]?.text])

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="py-2 flex flex-col gap-0">
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="px-1">
                <UserMessage text={msg.text} associatedTabIds={msg.associatedTabIds} />
              </div>
            ) : (
              <AssistantMessage key={msg.id} message={msg} settings={settings} />
            )
          )}
        </div>
      )}
      {/* Scroll anchor */}
      <div ref={anchorRef} style={{ height: "1px" }} />
    </div>
  )
}
