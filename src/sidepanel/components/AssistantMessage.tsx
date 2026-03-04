// Assistant message component - markdown, thinking block, tool calls

import { useState } from "react"
import { Markdown } from "./Markdown"
import { ToolCallIndicator } from "./ToolCallIndicator"
import type { UIMessage } from "../hooks/useChat"

// ── Icons ────────────────────────────────────────────────────────────────────

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

// ── Thinking Block ────────────────────────────────────────────────────────────

interface ThinkingBlockProps {
  content: string
  isStreaming?: boolean
}

function ThinkingBlock({ content, isStreaming }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="mb-2 rounded-md overflow-hidden text-xs"
      style={{ border: "1px solid #2a2a2a" }}
    >
      <button
        className="flex items-center gap-2 w-full px-2 py-1.5 text-left"
        style={{ backgroundColor: "#141414", color: "#666666" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="italic flex-1">
          {isStreaming && !expanded ? "Thinking…" : "Thinking"}
        </span>
        <IconChevron open={expanded} />
      </button>

      {expanded && (
        <div
          className="px-2 py-1.5 italic whitespace-pre-wrap break-words"
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
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  const hasThinking = message.thinking && message.thinking.length > 0
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0
  const hasText = message.text && message.text.length > 0

  // Empty streaming message (e.g. only a cursor shown initially)
  const showCursor = message.isStreaming && !hasText && !hasThinking && !hasToolCalls

  return (
    <div className="message-enter px-3 py-2.5">
      <div
        className="text-xs font-semibold mb-1.5 uppercase tracking-wide"
        style={{ color: "#666666" }}
      >
        TabFlow
      </div>

      {/* Thinking block */}
      {hasThinking && (
        <ThinkingBlock
          content={message.thinking!}
          isStreaming={message.isStreaming}
        />
      )}

      {/* Tool calls */}
      {hasToolCalls && (
        <div className="mb-2">
          {message.toolCalls!.map((tc) => (
            <ToolCallIndicator key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}

      {/* Main text */}
      {hasText && (
        <div style={{ color: "#e5e5e5" }}>
          <Markdown>{message.text}</Markdown>
          {message.isStreaming && <StreamingCursor />}
        </div>
      )}

      {/* Initial cursor while waiting for first token */}
      {showCursor && (
        <div style={{ height: "16px" }}>
          <StreamingCursor />
        </div>
      )}
    </div>
  )
}
