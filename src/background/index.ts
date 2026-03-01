// TabFlow background service worker
// Handles LLM calls, message routing, and state management

import type { Message, Response } from "../shared/messages"
import { ok, err, sendToContent } from "../shared/messages"

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

    default:
      console.warn("[TabFlow] background: unhandled message type", message.type)
      return err(`Unknown message type: ${message.type}`, message.requestId)
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

async function getActiveTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id ?? null
}

export {}
