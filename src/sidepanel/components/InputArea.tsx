// Input area - textarea with send/stop button

import { useRef, useEffect, useCallback } from "react"

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

// ── Component ────────────────────────────────────────────────────────────────

interface InputAreaProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

export function InputArea({ value, onChange, onSend, onStop, isStreaming, disabled }: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const newHeight = Math.min(el.scrollHeight, 200)
    el.style.height = `${newHeight}px`
  }, [value])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      if (!isStreaming && value.trim()) {
        onSend()
      }
    }
    // Enter alone = newline (default behavior, no override needed)
  }, [isStreaming, value, onSend])

  const canSend = !isStreaming && value.trim().length > 0
  const showStop = isStreaming

  return (
    <div
      className="flex-shrink-0 px-2 py-2"
      style={{ borderTop: "1px solid #2a2a2a", backgroundColor: "#0a0a0a" }}
    >
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

        {/* Send / Stop button */}
        <button
          onClick={showStop ? onStop : onSend}
          disabled={!showStop && !canSend}
          title={showStop ? "Stop generation" : "Send (⌘↵)"}
          className="flex-shrink-0 flex items-center justify-center rounded-md transition-colors"
          style={{
            width: "28px",
            height: "28px",
            marginBottom: "1px",
            backgroundColor: showStop
              ? "#ef4444"
              : canSend
              ? "#3b82f6"
              : "#1e1e1e",
            color: showStop || canSend ? "#fff" : "#666666",
            cursor: showStop || canSend ? "pointer" : "not-allowed",
            border: "none",
            outline: "none",
          }}
        >
          {showStop ? <IconStop /> : <IconSend />}
        </button>
      </div>

      {/* Hint */}
      <div className="text-center mt-1" style={{ color: "#444444", fontSize: "10px" }}>
        ↵ new line · ⌘↵ send
      </div>
    </div>
  )
}
