// Reusable settings section wrapper

import type { ReactNode } from "react"

interface SettingsSectionProps {
  title: string
  children: ReactNode
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="mb-6">
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "#666666" }}
      >
        {title}
      </h2>
      <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "#141414", border: "1px solid #2a2a2a" }}
      >
        {children}
      </div>
    </div>
  )
}
