// Tool execution coordinator - routes tools to content scripts or handles in background

import type { Response } from "../shared/messages"
import { ok, err, sendToContent } from "../shared/messages"
import { isValidTool } from "../shared/tools"
import type { ToolResult } from "../shared/tool-types"

// Tools that run in the background (not in content script)
const BACKGROUND_TOOLS = new Set(["page_navigate", "page_screenshot"])

// ── Execute Tool ─────────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  params: unknown,
  tabId: number
): Promise<ToolResult<unknown>> {
  if (!isValidTool(name)) {
    return { success: false, error: `Unknown tool: ${name}` }
  }

  console.log("[TabFlow] orchestrator: executing tool", name, "in tab", tabId)

  // Tools that run in background
  if (name === "page_navigate") {
    return executePageNavigate(params, tabId)
  }

  if (name === "page_screenshot") {
    return executePageScreenshot(params, tabId)
  }

  // All other tools run in content script
  try {
    const response = await sendToContent<{ name: string; params: unknown }, ToolResult<unknown>>(
      tabId,
      "tool:execute",
      { name, params }
    )

    if (!response.success) {
      return { success: false, error: response.error }
    }

    return response.data ?? { success: false, error: "No result from content script" }
  } catch (e) {
    return { success: false, error: `Failed to execute tool: ${e}` }
  }
}

// ── Page Navigate (Background Tool) ───────────────────────────────────────────

async function executePageNavigate(
  params: unknown,
  tabId: number
): Promise<ToolResult<unknown>> {
  const { url } = params as { url: string }
  if (!url) {
    return { success: false, error: "Missing url parameter" }
  }

  try {
    await chrome.tabs.update(tabId, { url })
    return { success: true, data: { navigated: true, url } }
  } catch (e) {
    return { success: false, error: `Failed to navigate: ${e}` }
  }
}

// ── Page Screenshot (Background Tool) ─────────────────────────────────────────

async function executePageScreenshot(
  params: unknown,
  tabId: number
): Promise<ToolResult<unknown>> {
  const { selector, fullPage } = params as { selector?: string; fullPage?: boolean }

  try {
    // First, prepare for screenshot in content script
    const prepResponse = await sendToContent<
      { name: string; params: unknown },
      { elementBounds?: { x: number; y: number; width: number; height: number }; devicePixelRatio: number }
    >(tabId, "tool:execute", { name: "page_screenshot_prep", params: { selector } })

    if (!prepResponse.success || !prepResponse.data) {
      return { success: false, error: prepResponse.error ?? "Failed to prepare screenshot" }
    }

    // Capture visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
      format: "png",
      quality: 100,
    })

    // If element-specific, return with bounds info
    if (prepResponse.data.elementBounds) {
      return {
        success: true,
        data: {
          data: dataUrl,
          mimeType: "image/png" as const,
          width: prepResponse.data.elementBounds.width,
          height: prepResponse.data.elementBounds.height,
          bounds: prepResponse.data.elementBounds,
        },
      }
    }

    // Return full viewport screenshot
    const viewportWidth = await getViewportWidth(tabId)
    const viewportHeight = await getViewportHeight(tabId)

    return {
      success: true,
      data: {
        data: dataUrl,
        mimeType: "image/png" as const,
        width: prepResponse.data.devicePixelRatio * viewportWidth,
        height: prepResponse.data.devicePixelRatio * viewportHeight,
      },
    }
  } catch (e) {
    return { success: false, error: `Failed to capture screenshot: ${e}` }
  }
}

// ── Viewport Helpers ─────────────────────────────────────────────────────────

async function getViewportWidth(tabId: number): Promise<number> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.innerWidth,
    })
    return results[0]?.result ?? 1920
  } catch {
    return 1920
  }
}

async function getViewportHeight(tabId: number): Promise<number> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.innerHeight,
    })
    return results[0]?.result ?? 1080
  } catch {
    return 1080
  }
}