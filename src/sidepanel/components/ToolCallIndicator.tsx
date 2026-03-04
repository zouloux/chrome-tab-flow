// Tool call indicator - collapsible pill showing tool name + result

import { useState } from "react"
import type { UIToolCall } from "../hooks/useChat"

// ── Icons ────────────────────────────────────────────────────────────────────

function IconSpinner() {
  return (
    <svg className="spinner" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 1v2M6 9v2M1 6h2M9 6h2M2.05 2.05l1.4 1.4M8.55 8.55l1.4 1.4M8.55 3.45l1.4-1.4M3.45 8.55l1.4-1.4" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6l3 3 5-5" />
    </svg>
  )
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10" height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }}
    >
      <path d="M2 3.5l3 3 3-3" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatToolName(name: string): string {
  // Convert snake_case to readable: "read_page_content" -> "read page content"
  return name.replace(/_/g, " ")
}

function truncate(text: string, maxLen = 200): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + "…"
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ToolCallIndicatorProps {
  toolCall: UIToolCall
}

export function ToolCallIndicator({ toolCall }: ToolCallIndicatorProps) {
  const [expanded, setExpanded] = useState(false)

  const hasResult = toolCall.result !== undefined

  return (
    <div
      className="my-1 rounded-md overflow-hidden text-xs"
      style={{ border: "1px solid #2a2a2a" }}
    >
      {/* Header pill */}
      <button
        className="flex items-center gap-2 w-full px-2 py-1.5 text-left transition-colors"
        style={{ backgroundColor: "#1e1e1e", color: "#a0a0a0" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2a2a2a" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1e1e1e" }}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Status icon */}
        <span style={{ color: hasResult ? "#22c55e" : "#60a5fa" }}>
          {toolCall.done && hasResult ? <IconCheck /> : <IconSpinner />}
        </span>

        {/* Tool name */}
        <span className="flex-1 truncate">{formatToolName(toolCall.name)}</span>

        {/* Expand chevron */}
        <IconChevron open={expanded} />
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ backgroundColor: "#141414", borderTop: "1px solid #2a2a2a" }}>
          {/* Arguments */}
          <div className="px-2 py-1.5">
            <div className="mb-1" style={{ color: "#666666" }}>Arguments</div>
            <pre
              className="whitespace-pre-wrap break-all"
              style={{ color: "#a0a0a0", fontSize: "11px", margin: 0 }}
            >
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {hasResult && (
            <div
              className="px-2 py-1.5"
              style={{ borderTop: "1px solid #2a2a2a" }}
            >
              <div className="mb-1" style={{ color: "#666666" }}>Result</div>
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
