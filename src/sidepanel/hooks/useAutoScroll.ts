// Auto-scroll hook - scrolls to bottom during streaming, pauses if user scrolls up

import { useRef, useEffect, useCallback } from "react"

export function useAutoScroll(deps: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)

  // Detect if user scrolled up
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function onScroll() {
      if (!el) return
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      // If user is within 50px of bottom, consider them "at bottom"
      userScrolledUpRef.current = distFromBottom > 50
    }

    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  // Auto-scroll when deps change (new content)
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      anchorRef.current?.scrollIntoView({ behavior: "instant" })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const scrollToBottom = useCallback(() => {
    userScrolledUpRef.current = false
    anchorRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  return { scrollRef, anchorRef, scrollToBottom }
}
