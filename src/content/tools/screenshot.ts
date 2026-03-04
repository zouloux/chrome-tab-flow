// Screenshot preparation tools - content script side
// Note: Actual capture is done by background script using chrome.tabs.captureVisibleTab

import type { PageScreenshotParams, ToolResult } from "../../shared/tool-types"

interface ScreenshotPrepResult {
  elementBounds?: {
    x: number
    y: number
    width: number
    height: number
  }
  viewport: {
    width: number
    height: number
    scrollX: number
    scrollY: number
  }
  devicePixelRatio: number
}

// ── page_screenshot_prep ───────────────────────────────────────────────────────
// Prepares for screenshot by scrolling element into view if needed and returning bounds info

export async function pageScreenshotPrep(
  params: PageScreenshotParams
): Promise<ToolResult<ScreenshotPrepResult>> {
  try {
    const { selector } = params

    if (selector) {
      const el = document.querySelector(selector)
      if (!el) {
        return { success: false, error: `Element not found: ${selector}` }
      }

      if (!(el instanceof HTMLElement)) {
        return { success: false, error: `Element is not an HTMLElement: ${selector}` }
      }

      el.scrollIntoView({ behavior: "instant", block: "center", inline: "center" })

      await new Promise((resolve) => requestAnimationFrame(resolve))

      const bounds = el.getBoundingClientRect()
      return {
        success: true,
        data: {
          elementBounds: {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          },
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
          },
          devicePixelRatio: window.devicePixelRatio,
        },
      }
    }

    return {
      success: true,
      data: {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        },
        devicePixelRatio: window.devicePixelRatio,
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── crop helper ─────────────────────────────────────────────────────────────────
// Used by background to crop element from full screenshot

export function cropImage(
  dataUrl: string,
  bounds: { x: number; y: number; width: number; height: number },
  devicePixelRatio: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Failed to get canvas context"))
        return
      }

      const scaledBounds = {
        x: bounds.x * devicePixelRatio,
        y: bounds.y * devicePixelRatio,
        width: bounds.width * devicePixelRatio,
        height: bounds.height * devicePixelRatio,
      }

      canvas.width = scaledBounds.width
      canvas.height = scaledBounds.height

      ctx.drawImage(
        img,
        scaledBounds.x,
        scaledBounds.y,
        scaledBounds.width,
        scaledBounds.height,
        0,
        0,
        scaledBounds.width,
        scaledBounds.height
      )

      resolve(canvas.toDataURL("image/png"))
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = dataUrl
  })
}