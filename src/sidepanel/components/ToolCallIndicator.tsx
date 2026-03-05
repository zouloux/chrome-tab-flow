// Tool call indicator - collapsible pill showing tool name + result

import { useState } from "react"
import { IconSpinner, IconCheck, IconChevron, IconWrench } from "./Icons"
import type { UIToolCall } from "../hooks/useChat"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatToolName(name: string): string {
  return name.replace(/_/g, " ")
}

function truncate(text: string, maxLen = 200): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + "..."
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ToolCallIndicatorProps {
  toolCall: UIToolCall
}

export function ToolCallIndicator({ toolCall }: ToolCallIndicatorProps) {
  const [expanded, setExpanded] = useState(false)

  const hasResult = toolCall.result !== undefined
  const isRunning = !toolCall.done || !hasResult

  return (
    <div
      className="my-1 rounded-md overflow-hidden text-xs"
      style={{ border: "1px solid #2a2a2a" }}
    >
      <button
        className="flex items-center gap-2 w-full px-2 py-1.5 text-left transition-colors"
        style={{ backgroundColor: "#141414", color: "#888888" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1e1e1e"
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#141414"
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span style={{ color: isRunning ? "#60a5fa" : "#22c55e" }}>
          {isRunning ? <IconSpinner /> : <IconCheck />}
        </span>
        <span className="flex-1 truncate">{formatToolName(toolCall.name)}</span>
        <IconChevron open={expanded} />
      </button>

      {expanded && (
        <div style={{ backgroundColor: "#0a0a0a", borderTop: "1px solid #2a2a2a" }}>
          <div className="px-2 py-1.5">
            <div className="mb-1" style={{ color: "#666666" }}>
              Arguments
            </div>
            <pre
              className="whitespace-pre-wrap break-all"
              style={{ color: "#a0a0a0", fontSize: "11px", margin: 0 }}
            >
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {hasResult && (
            <div
              className="px-2 py-1.5"
              style={{ borderTop: "1px solid #2a2a2a" }}
            >
              <div className="mb-1" style={{ color: "#666666" }}>
                Result
              </div>
              <pre
                className="whitespace-pre-wrap break-all"
                style={{ color: "#a0a0a0", fontSize: "11px", margin: 0 }}
              >
                {truncate(toolCall.result ?? "")}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
