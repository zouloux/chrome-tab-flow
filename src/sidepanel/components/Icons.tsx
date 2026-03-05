// Shared animated icons for the side panel

export function IconSpinner({ className = "spinner" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="6" cy="6" r="5" strokeOpacity="0.3" />
      <path d="M6 1a5 5 0 0 1 5 5" />
    </svg>
  )
}

export function IconCheck() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6l3 3 5-5" />
    </svg>
  )
}

export function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 150ms",
      }}
    >
      <path d="M2 3.5l3 3 3-3" />
    </svg>
  )
}

export function IconBrain() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a8 8 0 0 0-8 8c0 3.5 2.5 6.5 6 7.5V22h4v-4.5c3.5-1 6-4 6-7.5a8 8 0 0 0-8-8z" />
      <path d="M12 2v4M8 6c-1.5 1-2 3-2 4M16 6c1.5 1 2 3 2 4M9 12a3 3 0 0 0 6 0" />
    </svg>
  )
}

export function IconWrench() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}
