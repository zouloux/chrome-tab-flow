// Page interaction tools - content script implementations

import type {
  PageClickParams,
  PageFillParams,
  PageSelectParams,
  PageScrollParams,
  PageWaitParams,
  PageActionResult,
  ToolResult,
} from "../../shared/tool-types"

// ── page_click ──────────────────────────────────────────────────────────────────

export async function pageClick(
  params: PageClickParams
): Promise<ToolResult<PageActionResult>> {
  try {
    const { selector } = params

    const el = document.querySelector(selector)
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    if (!(el instanceof HTMLElement)) {
      return { success: false, error: `Element is not clickable: ${selector}` }
    }

    el.scrollIntoView({ behavior: "instant", block: "center" })
    el.click()

    return {
      success: true,
      data: { success: true, message: `Clicked: ${selector}` },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── page_fill ───────────────────────────────────────────────────────────────────

export async function pageFill(
  params: PageFillParams
): Promise<ToolResult<PageActionResult>> {
  try {
    const { selector, value } = params

    const el = document.querySelector(selector)
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
      return { success: false, error: `Element is not an input/textarea: ${selector}` }
    }

    el.scrollIntoView({ behavior: "instant", block: "center" })
    el.focus()
    el.value = value

    el.dispatchEvent(new Event("input", { bubbles: true }))
    el.dispatchEvent(new Event("change", { bubbles: true }))

    return {
      success: true,
      data: { success: true, message: `Filled: ${selector}` },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── page_select ─────────────────────────────────────────────────────────────────

export async function pageSelect(
  params: PageSelectParams
): Promise<ToolResult<PageActionResult>> {
  try {
    const { selector, value } = params

    const el = document.querySelector(selector)
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    if (!(el instanceof HTMLSelectElement)) {
      return { success: false, error: `Element is not a select: ${selector}` }
    }

    el.scrollIntoView({ behavior: "instant", block: "center" })
    el.value = value

    el.dispatchEvent(new Event("change", { bubbles: true }))

    return {
      success: true,
      data: { success: true, message: `Selected: ${value}` },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── page_scroll ─────────────────────────────────────────────────────────────────

export async function pageScroll(
  params: PageScrollParams
): Promise<ToolResult<PageActionResult>> {
  try {
    const { direction, amount, selector } = params

    const target = selector ? document.querySelector(selector) : null
    if (selector && !target) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    const scrollTarget = target instanceof HTMLElement ? target : document.scrollingElement
    if (!scrollTarget) {
      return { success: false, error: "No scrollable element found" }
    }

    const defaultAmount = scrollTarget instanceof HTMLElement
      ? scrollTarget.clientHeight
      : window.innerHeight

    const scrollAmount = amount ?? defaultAmount

    const scrollMap = {
      up: { top: -scrollAmount, left: 0 },
      down: { top: scrollAmount, left: 0 },
      left: { top: 0, left: -scrollAmount },
      right: { top: 0, left: scrollAmount },
    }

    const { top, left } = scrollMap[direction]

    if (scrollTarget instanceof HTMLElement) {
      scrollTarget.scrollBy({ top, left, behavior: "instant" })
    } else {
      window.scrollBy({ top, left, behavior: "instant" })
    }

    return {
      success: true,
      data: { success: true, message: `Scrolled ${direction} by ${scrollAmount}px` },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── page_wait ───────────────────────────────────────────────────────────────────

export async function pageWait(
  params: PageWaitParams
): Promise<ToolResult<PageActionResult>> {
  try {
    const { selector, timeout = 5000 } = params

    if (!selector) {
      await new Promise((resolve) => setTimeout(resolve, timeout))
      return {
        success: true,
        data: { success: true, message: `Waited ${timeout}ms` },
      }
    }

    const startTime = Date.now()

    return new Promise((resolve) => {
      const check = () => {
        const el = document.querySelector(selector)
        if (el) {
          resolve({
            success: true,
            data: { success: true, message: `Element appeared: ${selector}` },
          })
          return
        }

        if (Date.now() - startTime >= timeout) {
          resolve({ success: false, error: `Timeout waiting for: ${selector}` })
          return
        }

        requestAnimationFrame(check)
      }

      check()
    })
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}