// Conversation header - displays tab badges and add button

import { useState, useCallback, useEffect } from "react"
import { sendToBackground } from "../../shared/messages"
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

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,8 7,11 12,5" />
    </svg>
  )
}

const MAX_ADDITIONAL_TABS = 3

// ── Component ────────────────────────────────────────────────────────────────

interface ConversationHeaderProps {
  primaryTab?: TabInfo
  additionalTabs: TabInfo[]
  onRemoveAdditionalTab: (tabId: number) => void
  onAddTab: (tabId: number) => void
  primaryTabLocked: boolean
  excludeTabIds: number[]
}

export function ConversationHeader({
  primaryTab,
  additionalTabs,
  onRemoveAdditionalTab,
  onAddTab,
  primaryTabLocked,
  excludeTabIds,
}: ConversationHeaderProps) {
  const [showTabPicker, setShowTabPicker] = useState(false)
  const [availableTabs, setAvailableTabs] = useState<TabInfo[]>([])
  const [activeTab, setActiveTab] = useState<TabInfo | null>(null)

  const truncateTitle = (title: string, maxLength: number) => {
    return title.length > maxLength ? `${title.slice(0, maxLength)}...` : title
  }

  const canAddMore = additionalTabs.length < MAX_ADDITIONAL_TABS

  useEffect(() => {
    async function fetchTabs() {
      try {
        const res = await sendToBackground<null, TabInfo[]>("tabs:list", null)
        if (res.success && res.data) {
          setAvailableTabs(res.data)
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
          if (tab && tab.id) {
            const activeTabInfo = res.data.find((t) => t.id === tab.id)
            if (activeTabInfo) {
              setActiveTab(activeTabInfo)
            }
          }
        }
      } catch (e) {
        console.error("[TabFlow] ConversationHeader: failed to fetch tabs", e)
      }
    }
    fetchTabs()
  }, [])

  const handleSelectTab = useCallback((tabId: number) => {
    onAddTab(tabId)
    setShowTabPicker(false)
  }, [onAddTab])

  const sortedTabs = useCallback(() => {
    const tabs = [...availableTabs]
    const activeIndex = tabs.findIndex(t => activeTab && t.id === activeTab.id)
    if (activeIndex > 0) {
      const [active] = tabs.splice(activeIndex, 1)
      if (active) tabs.unshift(active)
    }
    return tabs
  }, [availableTabs, activeTab])

  const displayTabs = sortedTabs()

  return (
    <div
      className="flex-shrink-0 px-3 py-2 flex flex-wrap gap-2"
      style={{
        borderBottom: "1px solid #2a2a2a",
        backgroundColor: "#0a0a0a",
      }}
    >
      {/* Add tab button - always first */}
      <button
        onClick={() => canAddMore && setShowTabPicker(!showTabPicker)}
        disabled={!canAddMore}
        title={canAddMore ? "Add tab" : "Max tabs reached"}
        className="text-xs px-2 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
        style={{
          backgroundColor: canAddMore ? "#1e1e1e" : "#0a0a0a",
          color: canAddMore ? "#a0a0a0" : "#333333",
          border: canAddMore ? "1px solid #2a2a2a" : "1px solid #1a1a1a",
          cursor: canAddMore ? "pointer" : "not-allowed",
        }}
        onMouseEnter={(e) => {
          if (canAddMore) {
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2a2a2a"
          }
        }}
        onMouseLeave={(e) => {
          if (canAddMore) {
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1e1e1e"
          }
        }}
      >
        <IconPlus />
      </button>

      {/* Primary tab badge - only show when locked (after first message) */}
      {primaryTab && primaryTabLocked && (
        <div
          className="text-xs px-2 py-1.5 rounded-md flex items-center gap-1.5"
          style={{
            backgroundColor: "#1e3a5f",
            color: "#60a5fa",
            border: "1px solid #3b82f6",
            fontWeight: 500,
          }}
          title={`Primary tab: ${primaryTab.title} (locked)`}
        >
          <span>{truncateTitle(primaryTab.title, 30)}</span>
          <span style={{ color: "#93c5fd" }}>
            <IconLock />
          </span>
        </div>
      )}

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

      {/* Tab picker dropdown */}
      {showTabPicker && (
        <div
          className="w-full mt-1 rounded-lg overflow-hidden"
          style={{
            backgroundColor: "#141414",
            border: "1px solid #2a2a2a",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {displayTabs.map((tab) => {
            const isExcluded = excludeTabIds.includes(tab.id)
            const isActive = activeTab && activeTab.id === tab.id
            const canSelect = !isExcluded && additionalTabs.length < MAX_ADDITIONAL_TABS

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (canSelect) {
                    handleSelectTab(tab.id)
                  }
                }}
                disabled={!canSelect}
                className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
                style={{
                  backgroundColor: "transparent",
                  color: isExcluded ? "#666666" : "#e5e5e5",
                  borderBottom: "1px solid #1a1a1a",
                  cursor: canSelect ? "pointer" : "not-allowed",
                  opacity: !canSelect ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (canSelect) {
                    ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1e1e1e"
                  }
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"
                }}
              >
                {isExcluded ? (
                  <span style={{ color: "#60a5fa", display: "flex", alignItems: "center" }}>
                    <IconCheck />
                  </span>
                ) : (
                  <span style={{ width: "12px", height: "12px" }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    {tab.title}
                    {isActive && (
                      <span style={{ color: "#666666", marginLeft: "4px" }}>(current)</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
