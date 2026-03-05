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

// ── Lifecycle ─────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.log("[TabFlow] background: installed")
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

    // ── LLM Streaming ────────────────────────────────────────────────────────
    case "llm:stream": {
      const payload = message.payload as {
        conversationId: string
        message: string
        tabId?: number
      }

      const settings = await getSettings()
      const apiKey = getApiKeyForProvider(settings)
      if (!apiKey) {
        return err("API key not configured. Please add your API key in settings.", message.requestId)
      }

      // Get or create conversation state
      let conv = getConversation(payload.conversationId)
      if (!conv) {
        // Load from storage
        const stored = await getStoredConversation(payload.conversationId)
        if (stored) {
          conv = createConversation(stored.id, stored.tabId)
          conv.messages = stored.messages.map(storedMessageToLLM)
        } else {
          return err("Conversation not found", message.requestId)
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
        thinking: settings.showReasoning,
      }

      // Run conversation in background (no await)
      runConversation(conv, legacySettings, payload.message)
        .then(async () => {
          // Save to storage after completion, converting LLM messages to stored format
          const stored = await getStoredConversation(conv!.id)
          if (stored) {
            const now = Date.now()
            stored.messages = conv!.messages.map((m, i) => 
              llmMessageToStored(m, stored.messages[i]?.timestamp ?? now)
            )
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
    default:
      return null
  }
}

export {}
