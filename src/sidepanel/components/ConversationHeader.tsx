// Conversation header - displays associated tab badges

import type { TabInfo } from "../../shared/types"

// ── Icons ────────────────────────────────────────────────────────────────────

function IconClose() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="4" y="7" width="8" height="6" rx="1" />
      <path d="M6 7V5a2 2 0 0 1 4 0v2" />
    </svg>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

interface ConversationHeaderProps {
  primaryTab: TabInfo
  additionalTabs: TabInfo[]
  onRemoveAdditionalTab: (tabId: number) => void
  primaryTabLocked: boolean
}

export function ConversationHeader({
  primaryTab,
  additionalTabs,
  onRemoveAdditionalTab,
  primaryTabLocked,
}: ConversationHeaderProps) {
  const truncateTitle = (title: string, maxLength: number) => {
    return title.length > maxLength ? `${title.slice(0, maxLength)}...` : title
  }

  return (
    <div
      className="flex-shrink-0 px-3 py-2 flex flex-wrap gap-2"
      style={{
        borderBottom: "1px solid #2a2a2a",
        backgroundColor: "#0a0a0a",
      }}
    >
      {/* Primary tab badge */}
      <div
        className="text-xs px-2 py-1.5 rounded-md flex items-center gap-1.5"
        style={{
          backgroundColor: "#1e3a5f",
          color: "#60a5fa",
          border: "1px solid #3b82f6",
          fontWeight: 500,
        }}
        title={`Primary tab: ${primaryTab.title}${primaryTabLocked ? " (locked)" : " (tracking active tab)"}`}
      >
        <span>{truncateTitle(primaryTab.title, 30)}</span>
        {primaryTabLocked && (
          <span style={{ color: "#93c5fd" }}>
            <IconLock />
          </span>
        )}
      </div>

      {/* Additional tab badges */}
      {additionalTabs.map((tab) => (
        <div
          key={tab.id}
          className="text-xs px-2 py-1.5 rounded-md flex items-center gap-1.5"
          style={{
            backgroundColor: "#1e1e1e",
            color: "#a0a0a0",
            border: "1px solid #2a2a2a",
          }}
          title={tab.title}
        >
          <span>{truncateTitle(tab.title, 25)}</span>
          <button
            onClick={() => onRemoveAdditionalTab(tab.id)}
            className="flex items-center justify-center transition-colors"
            style={{
              width: "14px",
              height: "14px",
              color: "#666666",
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = "#ef4444"
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.color = "#666666"
            }}
            title="Remove tab"
          >
            <IconClose />
          </button>
        </div>
      ))}
    </div>
  )
}
