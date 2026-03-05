// TabFlow message protocol - typed envelope for all inter-context communication

// ── Message types ────────────────────────────────────────────────────────────

export type MessageType =
  | "ping"
  | "pong"
  | "tool:execute"
  | "tool:result"
  | "dom:getContent"
  | "dom:content"
  // LLM streaming
  | "llm:stream"
  | "llm:chunk"
  | "llm:done"
  | "llm:error"
  | "llm:abort"
  // Conversations
  | "conversation:new"
  | "conversation:list"
  | "conversation:load"
  | "conversation:save"
  | "conversation:delete"
  | "conversation:rename"
  | "conversation:data"
  // Tabs
  | "tabs:list"
  | "tabs:associate"
  // Settings
  | "settings:get"
  | "settings:set"
  | "settings:data"

// ── Envelope ─────────────────────────────────────────────────────────────────

export interface Message<T = unknown> {
  type: MessageType
  payload: T
  requestId?: string
}

export interface Response<T = unknown> {
  success: boolean
  data?: T
  error?: string
  requestId?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Send a message to the background service worker and await a typed response. */
export async function sendToBackground<TPayload, TData>(
  type: MessageType,
  payload: TPayload,
  requestId?: string
): Promise<Response<TData>> {
  const msg: Message<TPayload> = { type, payload, requestId: requestId ?? makeRequestId() }
  return chrome.runtime.sendMessage(msg) as Promise<Response<TData>>
}

/**
 * Send a message to the content script running in a given tab.
 * Call this from the background service worker only.
 */
export async function sendToContent<TPayload, TData>(
  tabId: number,
  type: MessageType,
  payload: TPayload,
  requestId?: string
): Promise<Response<TData>> {
  const msg: Message<TPayload> = { type, payload, requestId: requestId ?? makeRequestId() }
  return chrome.tabs.sendMessage(tabId, msg) as Promise<Response<TData>>
}

/** Build a success response. */
export function ok<T>(data: T, requestId?: string): Response<T> {
  return { success: true, data, requestId }
}

/** Build an error response. */
export function err(error: string, requestId?: string): Response<never> {
  return { success: false, error, requestId }
}
