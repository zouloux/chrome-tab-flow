// Assistant message component - markdown, thinking block, tool calls

import { useState, useEffect } from "react"
import { Markdown } from "./Markdown"
import { ToolCallIndicator } from "./ToolCallIndicator"
import { IconSpinner, IconChevron, IconBrain } from "./Icons"
import type { UIMessage } from "../hooks/useChat"
import type { Settings } from "../../shared/settings"

// ── Thinking Block ────────────────────────────────────────────────────────────

interface ThinkingBlockProps {
  content: string
  isStreaming?: boolean
  defaultExpanded?: boolean
}

function ThinkingBlock({ content, isStreaming, defaultExpanded }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)

  useEffect(() => {
    if (defaultExpanded !== undefined) {
      setExpanded(defaultExpanded)
    }
  }, [defaultExpanded])

  const isThinking = isStreaming

  return (
    <div
      className="mb-2 rounded-md overflow-hidden text-xs"
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
        <span style={{ color: isThinking ? "#60a5fa" : "#888888" }}>
          {isThinking ? <IconSpinner /> : <IconBrain />}
        </span>
        <span className="flex-1 text-left">
          {isThinking ? "Thinking..." : "Thoughts"}
        </span>
        <IconChevron open={expanded} />
      </button>

      {expanded && (
        <div
          className="px-2 py-1.5 whitespace-pre-wrap break-words"
          style={{
            backgroundColor: "#0a0a0a",
            color: "#666666",
            borderTop: "1px solid #2a2a2a",
            fontSize: "11px",
            lineHeight: "1.6",
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

// ── Streaming Cursor ──────────────────────────────────────────────────────────

function StreamingCursor() {
  return (
    <span
      style={{
        display: "inline-block",
        width: "2px",
        height: "13px",
        backgroundColor: "#60a5fa",
        marginLeft: "1px",
        verticalAlign: "text-bottom",
        animation: "blink 1s step-start infinite",
      }}
    />
  )
}

// ── Component ────────────────────────────────────────────────────────────────

interface AssistantMessageProps {
  message: UIMessage
  settings?: Settings
}

export function AssistantMessage({ message, settings }: AssistantMessageProps) {
  const hasThinking = message.thinking && message.thinking.length > 0
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0
  const hasText = message.text && message.text.length > 0

  const showCursor =
    message.isStreaming && !hasText && !hasThinking && !hasToolCalls

  return (
    <div className="message-enter px-3 py-2.5">
      <div
        className="text-xs font-semibold mb-1.5 uppercase tracking-wide"
        style={{ color: "#666666" }}
      >
        TabFlow
      </div>

      {hasThinking && (
        <ThinkingBlock
          content={message.thinking!}
          isStreaming={message.isStreaming}
          defaultExpanded={settings?.showReasoning}
        />
      )}

      {hasToolCalls && (
        <div className="mb-2">
          {message.toolCalls!.map((tc) => (
            <ToolCallIndicator key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}

      {hasText && (
        <div style={{ color: "#e5e5e5" }}>
          <Markdown>{message.text}</Markdown>
          {message.isStreaming && <StreamingCursor />}
        </div>
      )}

      {showCursor && (
        <div style={{ height: "16px" }}>
          <StreamingCursor />
        </div>
      )}
    </div>
  )
}
