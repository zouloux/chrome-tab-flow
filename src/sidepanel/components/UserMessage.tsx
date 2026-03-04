// User message component

interface UserMessageProps {
  text: string
}

export function UserMessage({ text }: UserMessageProps) {
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
    </div>
  )
}
