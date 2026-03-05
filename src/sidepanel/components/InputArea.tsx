// Input area - textarea with send/stop button and tab selection

import { useRef, useEffect, useCallback, useState } from "react"
import { sendToBackground } from "../../shared/messages"
import type { TabInfo } from "../../shared/types"

// ── Icons ────────────────────────────────────────────────────────────────────

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 13V3M4 7l4-4 4 4" />
    </svg>
  )
}

function IconStop() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" />
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

function IconClose() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
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

// ── Component ────────────────────────────────────────────────────────────────

interface InputAreaProps {
  value: string
  onChange: (value: string) => void
  onSend: (tabIds?: number[]) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
  selectedTabIds: number[]
  onTabsChange: (tabIds: number[]) => void
}

export function InputArea({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
  selectedTabIds,
  onTabsChange,
}: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showTabPicker, setShowTabPicker] = useState(false)
  const [availableTabs, setAvailableTabs] = useState<TabInfo[]>([])
  const [activeTab, setActiveTab] = useState<TabInfo | null>(null)

  // Fetch available tabs
  useEffect(() => {
    async function fetchTabs() {
      try {
        const res = await sendToBackground<null, TabInfo[]>("tabs:list", null)
        if (res.success && res.data) {
          setAvailableTabs(res.data)
          // Get current active tab
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
          if (tab && tab.id) {
            const activeTabInfo = res.data.find((t) => t.id === tab.id)
            if (activeTabInfo) {
              setActiveTab(activeTabInfo)
            }
          }
        }
      } catch (e) {
        console.error("[TabFlow] InputArea: failed to fetch tabs", e)
      }
    }
    fetchTabs()
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const newHeight = Math.min(el.scrollHeight, 200)
    el.style.height = `${newHeight}px`
  }, [value])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ( e.key === "Enter" && !e.shiftKey )
      {
        e.preventDefault()
        if (!isStreaming && value.trim()) {
          onSend(selectedTabIds)
        }
      }
      // Enter alone = newline (default behavior, no override needed)
    },
    [isStreaming, value, onSend, selectedTabIds]
  )

  const handleToggleTab = useCallback(
    (tabId: number) => {
      if (selectedTabIds.includes(tabId)) {
        // Remove tab
        onTabsChange(selectedTabIds.filter((id) => id !== tabId))
      } else {
        // Add tab (max 3)
        if (selectedTabIds.length < 3) {
          onTabsChange([...selectedTabIds, tabId])
        }
      }
    },
    [selectedTabIds, onTabsChange]
  )

  const handleRemoveTab = useCallback(
    (tabId: number) => {
      onTabsChange(selectedTabIds.filter((id) => id !== tabId))
    },
    [selectedTabIds, onTabsChange]
  )

  const canSend = !isStreaming && value.trim().length > 0
  const showStop = isStreaming

  // Get selected tabs info
  const selectedTabsInfo = availableTabs.filter((tab) => selectedTabIds.includes(tab.id))

  // Sort tabs intelligently: current active tab first, then by proximity/recent activity
  const sortedTabs = useCallback(() => {
    const tabs = [...availableTabs]

    // Get current active tab with chrome API to get tab.index
    chrome.tabs.query({ active: true, currentWindow: true }).then(([currentTab]) => {
      if (currentTab && currentTab.index !== undefined) {
        // Sort by proximity if we have index
        tabs.sort((a, b) => {
          const aTab = availableTabs.find(t => t.id === a.id)
          const bTab = availableTabs.find(t => t.id === b.id)

          // Current tab always first
          if (currentTab.id === a.id) return -1
          if (currentTab.id === b.id) return 1

          return 0
        })
      }
    })

    // Ensure active tab is first
    const activeIndex = tabs.findIndex(t => activeTab && t.id === activeTab.id)
    if (activeIndex > 0) {
      const [active] = tabs.splice(activeIndex, 1)
      tabs.unshift(active)
    }

    return tabs
  }, [availableTabs, activeTab])

  const displayTabs = sortedTabs()

  return (
    <div className="flex-shrink-0 px-2 py-2" style={{ borderTop: "1px solid #2a2a2a", backgroundColor: "#0a0a0a" }}>
      {/* Selected tabs badges */}
      {selectedTabsInfo.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedTabsInfo.map((tab) => (
            <div
              key={tab.id}
              className="text-xs px-2 py-1 rounded flex items-center gap-1.5"
              style={{
                backgroundColor: "#1e1e1e",
                color: "#a0a0a0",
                border: "1px solid #2a2a2a",
              }}
            >
              <span>{tab.title.length > 25 ? `${tab.title.slice(0, 25)}...` : tab.title}</span>
              <button
                onClick={() => handleRemoveTab(tab.id)}
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
              >
                <IconClose />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className="flex items-end gap-2 rounded-lg px-2 py-1.5"
        style={{
          backgroundColor: "#141414",
          border: "1px solid #2a2a2a",
        }}
        onFocus={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = "#3b82f6"
        }}
        onBlur={(e) => {
          // Only blur if focus left the container
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            const el = e.currentTarget as HTMLDivElement
            el.style.borderColor = "#2a2a2a"
          }
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this page…"
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm leading-5"
          style={{
            color: "#e5e5e5",
            caretColor: "#60a5fa",
            minHeight: "24px",
            maxHeight: "200px",
            fontFamily: "inherit",
            fontSize: "13px",
          }}
        />

        {/* Add tab button */}
        {selectedTabIds.length < 3 && (
          <button
            onClick={() => setShowTabPicker(!showTabPicker)}
            title="Add tab"
            className="flex-shrink-0 flex items-center gap-1 px-2 rounded-md transition-colors"
            style={{
              height: "24px",
              marginBottom: "1px",
              backgroundColor: "#1e1e1e",
              color: "#a0a0a0",
              border: "1px solid #2a2a2a",
              fontSize: "11px",
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2a2a2a"
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1e1e1e"
            }}
          >
            <IconPlus />
            <span>tab</span>
          </button>
        )}

        {/* Send / Stop button */}
        <button
          onClick={showStop ? onStop : () => onSend(selectedTabIds)}
          disabled={!showStop && !canSend}
          title={showStop ? "Stop generation" : "Send (⌘↵)"}
          className="flex-shrink-0 flex items-center justify-center rounded-md transition-colors"
          style={{
            width: "28px",
            height: "28px",
            marginBottom: "1px",
            backgroundColor: showStop ? "#ef4444" : canSend ? "#3b82f6" : "#1e1e1e",
            color: showStop || canSend ? "#fff" : "#666666",
            cursor: showStop || canSend ? "pointer" : "not-allowed",
            border: "none",
            outline: "none",
          }}
        >
          {showStop ? <IconStop /> : <IconSend />}
        </button>
      </div>

      {/* Tab picker dropdown */}
      {showTabPicker && (
        <div
          className="mt-2 rounded-lg overflow-hidden"
          style={{
            backgroundColor: "#141414",
            border: "1px solid #2a2a2a",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {selectedTabIds.length >= 3 && (
            <div
              className="px-3 py-2 text-center text-xs"
              style={{
                color: "#666666",
                borderBottom: "1px solid #1a1a1a",
              }}
            >
              Max 3 tabs
            </div>
          )}
          {displayTabs.map((tab) => {
            const isSelected = selectedTabIds.includes(tab.id)
            const isActive = activeTab && activeTab.id === tab.id
            const canSelect = !isSelected && selectedTabIds.length < 3

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (canSelect) {
                    handleToggleTab(tab.id)
                    setShowTabPicker(false)
                  }
                }}
                disabled={!canSelect}
                className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors"
                style={{
                  backgroundColor: "transparent",
                  color: isSelected ? "#666666" : "#e5e5e5",
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
                {isSelected ? (
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

      {/* Hint */}
      <div className="text-center mt-1" style={{ color: "#444444", fontSize: "10px" }}>
        ⇧↵ new line · ↵ send
      </div>
    </div>
  )
}
