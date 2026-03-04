// Header component - logo, settings gear, new chat button

interface HeaderProps {
  onSettings: () => void
  onNewChat: () => void
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.05 3.05l.7.7M12.25 12.25l.7.7M12.25 3.75l-.7.7M3.75 12.25l-.7.7" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

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
      {/* Logo */}
      <span
        className="font-semibold text-sm tracking-wide"
        style={{ color: "#60a5fa" }}
      >
        TabFlow
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1">
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
          <IconSettings />
        </button>

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
          <IconPlus />
        </button>
      </div>
    </div>
  )
}
