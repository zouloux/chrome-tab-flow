// Conversation list - collapsible bottom panel showing past conversations

import { useState } from "react"
import type { ConversationIndexEntry } from "../../shared/types"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`

  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms", flexShrink: 0 }}
    >
      <path d="M3 4.5l3 3 3-3" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" />
      <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" />
    </svg>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

interface ConversationListProps {
  conversations: ConversationIndexEntry[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNew,
}: ConversationListProps) {
  const [open, setOpen] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div
      className="flex-shrink-0"
      style={{ borderTop: "1px solid #2a2a2a", backgroundColor: "#0a0a0a" }}
    >
      {/* Toggle header */}
      <button
        className="flex items-center justify-between w-full px-3 py-2 text-xs"
        style={{ color: "#a0a0a0" }}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#141414" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent" }}
      >
        <span className="font-medium">
          Conversations
          {conversations.length > 0 && (
            <span className="ml-1.5" style={{ color: "#666666" }}>
              ({conversations.length})
            </span>
          )}
        </span>
        <IconChevron open={open} />
      </button>

      {/* List */}
      {open && (
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "220px", borderTop: "1px solid #1e1e1e" }}
        >
          {/* New conversation item */}
          <button
            className="flex items-center w-full px-3 py-2 text-xs gap-2 transition-colors"
            style={{ color: "#60a5fa" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#141414" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent" }}
            onClick={onNew}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="6" y1="2" x2="6" y2="10" />
              <line x1="2" y1="6" x2="10" y2="6" />
            </svg>
            New conversation
          </button>

          {/* Conversation items */}
          {conversations.length === 0 && (
            <div className="px-3 py-3 text-xs" style={{ color: "#666666" }}>
              No conversations yet
            </div>
          )}

          {conversations.map((conv) => {
            const isActive = conv.id === activeId
            const isHovered = hoveredId === conv.id

            return (
              <div
                key={conv.id}
                className="flex items-center group"
                style={{
                  backgroundColor: isActive ? "#1e1e1e" : isHovered ? "#141414" : "transparent",
                  transition: "background-color 100ms",
                }}
                onMouseEnter={() => setHoveredId(conv.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  className="flex-1 flex items-center justify-between px-3 py-2 text-xs text-left min-w-0 gap-2"
                  style={{ color: isActive ? "#e5e5e5" : "#a0a0a0" }}
                  onClick={() => onSelect(conv.id)}
                >
                  <span className="truncate flex-1">{conv.title}</span>
                  <span className="flex-shrink-0" style={{ color: "#666666", fontSize: "10px" }}>
                    {formatDate(conv.updatedAt)}
                  </span>
                </button>

                {/* Delete button - visible on hover */}
                <button
                  className="flex-shrink-0 flex items-center justify-center mr-2 rounded opacity-0 transition-opacity"
                  style={{
                    width: "20px",
                    height: "20px",
                    color: "#666666",
                    opacity: isHovered ? 1 : 0,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(conv.id)
                  }}
                  title="Delete conversation"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444" }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#666666" }}
                >
                  <IconX />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
