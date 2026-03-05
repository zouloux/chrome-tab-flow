// Toggle switch component

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label
      className="flex items-center gap-3 cursor-pointer"
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      <div
        onClick={() => !disabled && onChange(!checked)}
        className="relative inline-flex items-center rounded-full transition-colors"
        style={{
          width: "36px",
          height: "20px",
          backgroundColor: checked ? "#3b82f6" : "#2a2a2a",
        }}
      >
        <span
          className="absolute rounded-full transition-transform"
          style={{
            width: "16px",
            height: "16px",
            backgroundColor: "#ffffff",
            transform: checked ? "translateX(18px)" : "translateX(2px)",
          }}
        />
      </div>
      {label && (
        <span className="text-sm" style={{ color: "#e5e5e5" }}>
          {label}
        </span>
      )}
    </label>
  )
}
