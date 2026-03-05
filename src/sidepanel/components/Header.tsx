import { Settings, Plus } from "iconoir-react"

interface HeaderProps {
  onSettings: () => void
  onNewChat: () => void
}

export function Header({ onSettings, onNewChat }: HeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-3 border-b"
      style={{
        height: "40px",
        backgroundColor: "#0a0a0a",
        borderColor: "#2a2a2a",
        flexShrink: 0,
      }}
    >
      {/* Settings button */}
      <button
        onClick={onSettings}
        title="Settings"
        className="flex items-center justify-center rounded transition-colors"
        style={{
          width: "28px",
          height: "28px",
          color: "#a0a0a0",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#e5e5e5"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1e1e1e" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#a0a0a0"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent" }}
      >
        <Settings width={16} height={16} />
      </button>

      {/* Logo */}
      <span
        className="font-semibold text-sm tracking-wide"
        style={{ color: "#60a5fa" }}
      >
        TabFlow
      </span>

      {/* New chat button */}
      <button
        onClick={onNewChat}
        title="New chat"
        className="flex items-center justify-center rounded transition-colors"
        style={{
          width: "28px",
          height: "28px",
          color: "#a0a0a0",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#e5e5e5"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1e1e1e" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#a0a0a0"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent" }}
      >
        <Plus width={16} height={16} />
      </button>
    </div>
  )
}
