// TabFlow background service worker
// Handles LLM calls, message routing, and state management

import type { Message, Response } from "../shared/messages"
import { ok, err } from "../shared/messages"
import type { Settings } from "../shared/settings"
import { DEFAULT_SETTINGS } from "../shared/settings"
import type { ConversationIndexEntry, LLMMessage } from "../shared/types"
import {
  state,
  getConversation,
  getConversationForTab,
  createConversation,
  deleteConversation as deleteConversationFromState,
  abortStream,
  createAbortController,
  clearAbortController,
} from "./state"
import {
  getSettings,
  saveSettings,
  getConversations,
  getConversation as getStoredConversation,
  saveConversation,
  deleteConversationFromStorage,
  setActiveConversationId,
  getActiveConversationId,
  generateTitle,
  storedMessageToLLM,
  llmMessageToStored,
  type StoredConversation,
} from "./storage"
import { runConversation } from "./orchestrator"
import { initEncryption } from "./encryption"

// ── Lifecycle ─────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  console.log("[TabFlow] background: installed")
  await initEncryption()
})

chrome.runtime.onStartup.addListener(async () => {
  console.log("[TabFlow] background: startup")
  await initEncryption()
})

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  console.log("[TabFlow] background: opening side panel for tab", tab.id)
  chrome.sidePanel.open({ tabId: tab.id! })
})

// ── Message Router ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse: (r: Response) => void) => {
    console.log("[TabFlow] background: received", message.type, "from", sender.tab ? `tab ${sender.tab.id}` : "extension")

    handleMessage(message, sender).then(sendResponse)
    return true // async response
  }
)

async function handleMessage(message: Message, sender: chrome.runtime.MessageSender): Promise<Response> {
  switch (message.type) {
    // ── Ping ──────────────────────────────────────────────────────────────────
    case "ping": {
      const tabId = await getActiveTabId()
      if (tabId === null) {
        return err("No active tab found", message.requestId)
      }
      return ok({ status: "ok", tabId }, message.requestId)
    }

    // ── Settings ──────────────────────────────────────────────────────────────
    case "settings:get": {
      const settings = await getSettings()
      return ok(settings, message.requestId)
    }

    case "settings:set": {
      const payload = message.payload as Partial<Settings>
      const updated = await saveSettings(payload)
      return ok(updated, message.requestId)
    }

    // ── Conversations ─────────────────────────────────────────────────────────
    case "conversation:new": {
      const payload = message.payload as { tabId?: number; tabUrl?: string }
      const tabId = payload.tabId ?? (await getActiveTabId()) ?? 0
      const tabUrl = payload.tabUrl ?? ""

      const id = crypto.randomUUID()
      const conv: StoredConversation = {
        id,
        title: "New Conversation",
        tabId,
        tabUrl,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await saveConversation(conv)
      createConversation(id, tabId)
      await setActiveConversationId(id)

      return ok(conv, message.requestId)
    }

    case "conversation:list": {
      const conversations = await getConversations()
      return ok(conversations, message.requestId)
    }

    case "conversation:load": {
      const payload = message.payload as { id: string }
      const conv = await getStoredConversation(payload.id)
      if (!conv) {
        return err("Conversation not found", message.requestId)
      }

      // Create in-memory state if not exists, converting stored messages to LLM format
      if (!getConversation(conv.id)) {
        const stateConv = createConversation(conv.id, conv.tabId)
        stateConv.messages = conv.messages.map(storedMessageToLLM)
      }

      await setActiveConversationId(conv.id)
      return ok(conv, message.requestId)
    }

    case "conversation:delete": {
      const payload = message.payload as { id: string }
      await deleteConversationFromStorage(payload.id)
      deleteConversationFromState(payload.id)

      // Clear active if it was the deleted conversation
      const activeId = await getActiveConversationId()
      if (activeId === payload.id) {
        await setActiveConversationId(null)
      }

      return ok({ deleted: true }, message.requestId)
    }

    case "conversation:rename": {
      const payload = message.payload as { id: string; title: string }
      const conv = await getStoredConversation(payload.id)
      if (!conv) {
        return err("Conversation not found", message.requestId)
      }

      conv.title = payload.title
      conv.updatedAt = Date.now()
      await saveConversation(conv)

      return ok(conv, message.requestId)
    }

    case "conversation:save": {
      const payload = message.payload as StoredConversation
      payload.updatedAt = Date.now()
      await saveConversation(payload)
      return ok(payload, message.requestId)
    }

    // ── Tabs ──────────────────────────────────────────────────────────────────
    case "tabs:list": {
      const tabs = await chrome.tabs.query({})
      const tabsInfo = tabs.map((tab) => ({
        id: tab.id!,
        title: tab.title ?? "Untitled",
        url: tab.url,
      }))
      return ok(tabsInfo, message.requestId)
    }

    case "tabs:associate": {
      const payload = message.payload as { conversationId: string; tabIds: number[] }

      // Validate: max 3 tabs
      if (payload.tabIds.length > 3) {
        return err("Maximum 3 tabs can be associated", message.requestId)
      }

      // Validate: no duplicates
      const uniqueTabIds = Array.from(new Set(payload.tabIds))
      if (uniqueTabIds.length !== payload.tabIds.length) {
        return err("Duplicate tab IDs are not allowed", message.requestId)
      }

      // Update conversation
      const conv = await getStoredConversation(payload.conversationId)
      if (!conv) {
        return err("Conversation not found", message.requestId)
      }

      conv.associatedTabIds = payload.tabIds
      conv.updatedAt = Date.now()
      await saveConversation(conv)

      return ok({ updated: true }, message.requestId)
    }

    // ── LLM Streaming ────────────────────────────────────────────────────────
    case "llm:stream": {
      const payload = message.payload as {
        conversationId: string
        message: string
        tabIds?: number[]
      }

      const settings = await getSettings()
      const apiKey = getApiKeyForProvider(settings)
      if (!apiKey) {
        return err("API key not configured. Please add your API key in settings.", message.requestId)
      }

      // Get or create conversation state
      let conv = getConversation(payload.conversationId)
      let stored = await getStoredConversation(payload.conversationId)

      if (!conv) {
        // Load from storage
        if (stored) {
          conv = createConversation(stored.id, stored.tabId)
          conv.messages = stored.messages.map(storedMessageToLLM)
        } else {
          return err("Conversation not found", message.requestId)
        }
      }

      // Determine associated tabs for this message
      let associatedTabIds = payload.tabIds ?? []

      // If no tabs provided or empty:
      // 1. Try to use previously associated tabs from storage
      // 2. Otherwise use current active tab
      if (associatedTabIds.length === 0) {
        if (stored && stored.associatedTabIds && stored.associatedTabIds.length > 0) {
          associatedTabIds = stored.associatedTabIds
        } else {
          const activeTabId = await getActiveTabId()
          if (activeTabId !== null) {
            associatedTabIds = [activeTabId]
          }
        }
      }

      // Update conversation's associated tabs
      if (stored) {
        stored.associatedTabIds = associatedTabIds
        await saveConversation(stored)
      }

      // Update in-memory conversation state tabId
      if (associatedTabIds.length > 0) {
        conv.tabId = associatedTabIds[0]!
      }

      // Inject content scripts in all associated tabs
      for (const tabId of associatedTabIds) {
        try {
          const { ensureContentScript } = await import("./tools")
          await ensureContentScript(tabId)
        } catch (e) {
          console.warn(`[TabFlow] Failed to inject content script in tab ${tabId}:`, e)
        }
      }

      // Check if already streaming
      if (conv.isStreaming) {
        return err("Conversation is already streaming", message.requestId)
      }

      // Create abort controller
      createAbortController(conv.id)

      // Transform settings to legacy format for orchestrator
      const legacySettings = {
        provider: settings.defaultProvider,
        apiKey: getApiKeyForProvider(settings)!,
        model: settings.defaultModel,
        maxTokens: settings.maxTokens,
        temperature: settings.temperature,
        thinking: true,
      }

      // Run conversation in background (no await)
      runConversation(conv, legacySettings, payload.message, associatedTabIds)
        .then(async () => {
          // Save to storage after completion, converting LLM messages to stored format
          const stored = await getStoredConversation(conv!.id)
          if (stored) {
            const now = Date.now()
            stored.messages = conv!.messages.map((m, i) =>
              llmMessageToStored(m, stored.messages[i]?.timestamp ?? now)
            )

            // Add associatedTabIds to the last user message
            const lastUserMsgIdx = stored.messages.length - 1 - stored.messages.slice().reverse().findIndex((m) => m.role === "user")
            if (lastUserMsgIdx >= 0 && stored.messages[lastUserMsgIdx]) {
              stored.messages[lastUserMsgIdx]!.associatedTabIds = associatedTabIds
            }

            stored.updatedAt = now
            // Auto-generate title from first user message
            if (stored.messages.length === 1 && stored.messages[0]?.role === "user") {
              stored.title = generateTitle(stored.messages[0].content as string)
            }
            await saveConversation(stored)
          }
          clearAbortController(conv!.id)
        })
        .catch((e) => {
          console.error("[TabFlow] background: conversation error", e)
          clearAbortController(conv!.id)
        })

      return ok({ started: true }, message.requestId)
    }

    case "llm:abort": {
      const payload = message.payload as { conversationId: string }
      const aborted = abortStream(payload.conversationId)
      return ok({ aborted }, message.requestId)
    }

    // ── Tool Execution (legacy, for direct tool calls) ────────────────────────
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

      return executeToolLegacy(name, params, tabId, message.requestId)
    }

    default:
      console.warn("[TabFlow] background: unhandled message type", message.type)
      return err(`Unknown message type: ${message.type}`, message.requestId)
  }
}

// ── Legacy Tool Execution ────────────────────────────────────────────────────

async function executeToolLegacy(
  name: string,
  params: unknown,
  tabId: number,
  requestId?: string
): Promise<Response> {
  // Import the legacy tool executor
  const { executeTool } = await import("./tools")
  
  try {
    const result = await executeTool(name, params, tabId)
    if (result.success) {
      return ok(result.data, requestId)
    } else {
      return err(result.error ?? "Tool execution failed", requestId)
    }
  } catch (e) {
    return err(`Failed to execute tool: ${e}`, requestId)
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

async function getActiveTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id ?? null
}

function getApiKeyForProvider(settings: Settings): string | null {
  switch (settings.defaultProvider) {
    case "anthropic":
      return settings.anthropicApiKey || null
    case "openai":
      return settings.openaiApiKey || null
    case "gemini":
      return settings.geminiApiKey || null
    case "openrouter":
      return settings.openrouterApiKey || null
    default:
      return null
  }
}

export {}
