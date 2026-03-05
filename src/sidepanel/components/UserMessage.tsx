// User message component

import { useState, useEffect } from "react"
import { sendToBackground } from "../../shared/messages"
import type { TabInfo } from "../../shared/types"

interface UserMessageProps {
  text: string
  associatedTabIds?: number[]
}

export function UserMessage({ text, associatedTabIds }: UserMessageProps) {
  const [tabsInfo, setTabsInfo] = useState<TabInfo[]>([])

  useEffect(() => {
    if (!associatedTabIds || associatedTabIds.length === 0) return

    async function fetchTabsInfo() {
      try {
        const res = await sendToBackground<null, TabInfo[]>("tabs:list", null)
        if (res.success && res.data) {
          const filteredTabs = res.data.filter((tab) => associatedTabIds!.includes(tab.id))
          setTabsInfo(filteredTabs)
        }
      } catch (e) {
        console.error("[TabFlow] UserMessage: failed to fetch tabs info", e)
      }
    }

    fetchTabsInfo()
  }, [associatedTabIds])

  return (
    <div className="message-enter px-3 py-2.5 rounded-lg" style={{ backgroundColor: "#141414" }}>
      <div
        className="text-xs font-semibold mb-1.5 uppercase tracking-wide"
        style={{ color: "#666666" }}
      >
        You
      </div>
      <div className="whitespace-pre-wrap break-words" style={{ color: "#e5e5e5" }}>
        {text}
      </div>

      {/* Tab badges */}
      {tabsInfo.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tabsInfo.map((tab) => (
            <div
              key={tab.id}
              className="text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: "#1e1e1e",
                color: "#a0a0a0",
                border: "1px solid #2a2a2a",
              }}
              title={tab.url}
            >
              {tab.title.length > 30 ? `${tab.title.slice(0, 30)}...` : tab.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
