// TabFlow background service worker
// Handles LLM calls, message routing, and state management

import type { Message, Response } from "../shared/messages"
import { ok, err, sendToContent } from "../shared/messages"
import type { ToolResult } from "../shared/tool-types"
import { isValidTool, toolSchemas } from "../shared/tools"

// ── Lifecycle ─────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.log("[TabFlow] background: installed")
})

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  console.log("[TabFlow] background: opening side panel for tab", tab.id)
  chrome.sidePanel.open({ tabId: tab.id! })
})

// ── Message router ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse: (r: Response) => void) => {
    console.log("[TabFlow] background: received", message.type, "from", sender.tab ? `tab ${sender.tab.id}` : "extension")

    // Return true to indicate we will respond asynchronously
    handleMessage(message, sender).then(sendResponse)
    return true
  }
)

async function handleMessage(message: Message, sender: chrome.runtime.MessageSender): Promise<Response> {
  switch (message.type) {
    case "ping": {
      // Forward ping to the active content script and relay the response back
      const tabId = await getActiveTabId()
      if (tabId === null) {
        return err("No active tab found", message.requestId)
      }
      console.log("[TabFlow] background: forwarding ping to content script in tab", tabId)
      try {
        const response = await sendToContent<unknown, string>(tabId, "ping", message.payload, message.requestId)
        console.log("[TabFlow] background: got pong from content script", response)
        return response
      } catch (_e) {
        // Content script not present in this tab (e.g. tab was open before extension loaded).
        // Inject it programmatically and retry once.
        console.log("[TabFlow] background: content script missing – injecting and retrying")
        try {
          await chrome.scripting.executeScript({ target: { tabId }, files: ["content/index.js"] })
          const response = await sendToContent<unknown, string>(tabId, "ping", message.payload, message.requestId)
          console.log("[TabFlow] background: got pong after injection", response)
          return response
        } catch (e2) {
          return err(`Content script unreachable: ${e2}`, message.requestId)
        }
      }
    }

    case "tool:execute": {
      const payload = message.payload as { name: string; params: unknown; tabId?: number } | undefined
      if (!payload?.name) {
        return err("Missing tool name", message.requestId)
      }

      const { name, params, tabId: explicitTabId } = payload
      const tabId = explicitTabId ?? (await getActiveTabId())

      if (tabId === null) {
        return err("No active tab found", message.requestId)
      }

      return executeTool(name, params, tabId, message.requestId)
    }

    default:
      console.warn("[TabFlow] background: unhandled message type", message.type)
      return err(`Unknown message type: ${message.type}`, message.requestId)
  }
}

// ── Tool Execution ────────────────────────────────────────────────────────────

const BACKGROUND_TOOLS = new Set(["page_navigate", "page_screenshot"])

async function executeTool(
  name: string,
  params: unknown,
  tabId: number,
  requestId?: string
): Promise<Response> {
  if (!isValidTool(name)) {
    return err(`Unknown tool: ${name}`, requestId)
  }

  console.log("[TabFlow] background: executing tool", name, "in tab", tabId)

  // Tools that run in background
  if (name === "page_navigate") {
    return executePageNavigate(params, tabId, requestId)
  }

  if (name === "page_screenshot") {
    return executePageScreenshot(params, tabId, requestId)
  }

  // All other tools run in content script
  try {
    const response = await sendToContent<{ name: string; params: unknown }, ToolResult<unknown>>(
      tabId,
      "tool:execute",
      { name, params },
      requestId
    )
    return response
  } catch (e) {
    return err(`Failed to execute tool: ${e}`, requestId)
  }
}

async function executePageNavigate(
  params: unknown,
  tabId: number,
  requestId?: string
): Promise<Response> {
  const { url } = params as { url: string }
  if (!url) {
    return err("Missing url parameter", requestId)
  }

  try {
    await chrome.tabs.update(tabId, { url })
    return ok({ success: true, message: `Navigated to: ${url}` }, requestId)
  } catch (e) {
    return err(`Failed to navigate: ${e}`, requestId)
  }
}

async function executePageScreenshot(
  params: unknown,
  tabId: number,
  requestId?: string
): Promise<Response> {
  const { selector, fullPage } = params as { selector?: string; fullPage?: boolean }

  try {
    // First, prepare for screenshot in content script
    const prepResponse = await sendToContent<
      { name: string; params: unknown },
      { elementBounds?: { x: number; y: number; width: number; height: number }; devicePixelRatio: number }
    >(tabId, "tool:execute", { name: "page_screenshot_prep", params: { selector } }, requestId)

    if (!prepResponse.success || !prepResponse.data) {
      return err(prepResponse.error ?? "Failed to prepare screenshot", requestId)
    }

    // Capture visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
      format: "png",
      quality: 100,
    })

    // If element-specific, we need to crop
    if (prepResponse.data.elementBounds) {
      // For now, return the full screenshot with bounds info
      // A full implementation would use an offscreen document to crop
      return ok(
        {
          data: dataUrl,
          mimeType: "image/png" as const,
          width: prepResponse.data.elementBounds.width,
          height: prepResponse.data.elementBounds.height,
          bounds: prepResponse.data.elementBounds,
        },
        requestId
      )
    }

    // Return full viewport screenshot
    return ok(
      {
        data: dataUrl,
        mimeType: "image/png" as const,
        width: prepResponse.data.devicePixelRatio * (await getViewportWidth(tabId)),
        height: prepResponse.data.devicePixelRatio * (await getViewportHeight(tabId)),
      },
      requestId
    )
  } catch (e) {
    return err(`Failed to capture screenshot: ${e}`, requestId)
  }
}

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

// ── Utilities ─────────────────────────────────────────────────────────────────

async function getActiveTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id ?? null
}

export {}
