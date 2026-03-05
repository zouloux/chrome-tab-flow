// Tool execution coordinator - routes tools to content scripts or handles in background

import type { Response } from "../shared/messages"
import { ok, err, sendToContent } from "../shared/messages"
import { isValidTool } from "../shared/tools"
import type { ToolResult } from "../shared/tool-types"

// Tools that run in the background (not in content script)
const BACKGROUND_TOOLS = new Set(["page_navigate", "page_screenshot", "tab_switch"])

// ── Content Script Injection ──────────────────────────────────────────────────

const CONTENT_SCRIPT_PATH = "content/index.js"

async function isContentScriptReady(tabId: number): Promise<boolean> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "ping" })
    return response?.success === true
  } catch {
    return false
  }
}

async function injectContentScript(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("about:")) {
      return false
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [CONTENT_SCRIPT_PATH],
    })
    await new Promise((r) => setTimeout(r, 100))
    return true
  } catch (e) {
    console.error("[TabFlow] Failed to inject content script:", e)
    return false
  }
}

export async function ensureContentScript(tabId: number): Promise<boolean> {
  if (await isContentScriptReady(tabId)) {
    return true
  }
  console.log("[TabFlow] Content script not ready, injecting...")
  return injectContentScript(tabId)
}

// ── Execute Tool ─────────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  params: unknown,
  defaultTabId: number,
  associatedTabIds?: number[]
): Promise<ToolResult<unknown>> {
  if (!isValidTool(name)) {
    return { success: false, error: `Unknown tool: ${name}` }
  }

  // Extract tabId from params if provided, otherwise use default
  const paramsObj = params as { tabId?: number; [key: string]: unknown }
  const tabId = paramsObj.tabId ?? defaultTabId

  console.log("[TabFlow] orchestrator: executing tool", name, "in tab", tabId)

  // Tools that run in background
  if (name === "page_navigate") {
    return executePageNavigate(params, tabId)
  }

  if (name === "page_screenshot") {
    return executePageScreenshot(params, tabId)
  }

  if (name === "tab_switch") {
    return executeTabSwitch(params, associatedTabIds ?? [tabId])
  }

  // All other tools run in content script
  try {
    if (!(await ensureContentScript(tabId))) {
      return {
        success: false,
        error: "Cannot access this page. Try refreshing the page or navigating to a regular website (not chrome:// or extension pages).",
      }
    }

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
    if (!(await ensureContentScript(tabId))) {
      return {
        success: false,
        error: "Cannot access this page. Try refreshing the page or navigating to a regular website.",
      }
    }

    const prepResponse = await sendToContent<
      { name: string; params: unknown },
      { elementBounds?: { x: number; y: number; width: number; height: number }; devicePixelRatio: number }
    >(tabId, "tool:execute", { name: "page_screenshot_prep", params: { selector } })

    if (!prepResponse.success || !prepResponse.data) {
      return { success: false, error: prepResponse.error ?? "Failed to prepare screenshot" }
    }

    // Capture visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(chrome.windows.WINDOW_ID_CURRENT, {
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

// ── Tab Switch (Background Tool) ──────────────────────────────────────────────

async function executeTabSwitch(
  params: unknown,
  associatedTabIds: number[]
): Promise<ToolResult<unknown>> {
  const { tabId } = params as { tabId: number }

  // Validate tab is associated
  if (!associatedTabIds.includes(tabId)) {
    return {
      success: false,
      error: `Tab ${tabId} is not associated with this conversation. Associated tabs: ${associatedTabIds.join(", ")}`,
    }
  }

  try {
    await chrome.tabs.update(tabId, { active: true })
    // Small delay to ensure tab is activated
    await new Promise((resolve) => setTimeout(resolve, 100))

    return {
      success: true,
      data: { tabId, switched: true },
    }
  } catch (e) {
    return {
      success: false,
      error: `Failed to switch to tab: ${e}`,
    }
  }
}