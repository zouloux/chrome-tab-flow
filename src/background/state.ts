// In-memory state management for TabFlow background service worker

import type { LLMMessage, ToolCall } from "../shared/types"

// ── Conversation State ───────────────────────────────────────────────────────

export interface ConversationState {
  id: string
  tabId: number
  messages: LLMMessage[]
  isStreaming: boolean
  pendingToolCalls: ToolCall[]
}

// ── Background State ──────────────────────────────────────────────────────────

export interface BackgroundState {
  activeConversations: Map<string, ConversationState>
  abortControllers: Map<string, AbortController>
  tabToConversation: Map<number, string> // tabId -> conversationId mapping
}

// ── Global State Instance ────────────────────────────────────────────────────

export const state: BackgroundState = {
  activeConversations: new Map(),
  abortControllers: new Map(),
  tabToConversation: new Map(),
}

// ── State Helpers ────────────────────────────────────────────────────────────

export function getConversation(id: string): ConversationState | undefined {
  return state.activeConversations.get(id)
}

export function getConversationForTab(tabId: number): ConversationState | undefined {
  const convId = state.tabToConversation.get(tabId)
  if (!convId) return undefined
  return state.activeConversations.get(convId)
}

export function createConversation(id: string, tabId: number): ConversationState {
  const conv: ConversationState = {
    id,
    tabId,
    messages: [],
    isStreaming: false,
    pendingToolCalls: [],
  }
  state.activeConversations.set(id, conv)
  state.tabToConversation.set(tabId, id)
  return conv
}

export function deleteConversation(id: string): void {
  const conv = state.activeConversations.get(id)
  if (conv) {
    state.tabToConversation.delete(conv.tabId)
    state.activeConversations.delete(id)
    state.abortControllers.delete(id)
  }
}

export function setStreaming(id: string, streaming: boolean): void {
  const conv = state.activeConversations.get(id)
  if (conv) {
    conv.isStreaming = streaming
  }
}

export function getAbortController(id: string): AbortController | undefined {
  return state.abortControllers.get(id)
}

export function createAbortController(id: string): AbortController {
  const controller = new AbortController()
  state.abortControllers.set(id, controller)
  return controller
}

export function clearAbortController(id: string): void {
  state.abortControllers.delete(id)
}

export function abortStream(id: string): boolean {
  const controller = state.abortControllers.get(id)
  if (controller) {
    controller.abort()
    clearAbortController(id)
    setStreaming(id, false)
    return true
  }
  return false
}