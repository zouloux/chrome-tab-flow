// Shared types for TabFlow extension

// ── Chat / UI types ───────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "tool"

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
}

export interface ExtensionMessage {
  type: string
  payload?: unknown
}

// ── JSON Schema (minimal, for tool parameters) ────────────────────────────────

export type JSONSchema = {
  type: string
  properties?: Record<string, JSONSchema>
  items?: JSONSchema
  required?: string[]
  description?: string
  enum?: unknown[]
  [key: string]: unknown
}

// ── LLM types ─────────────────────────────────────────────────────────────────

export type LLMProvider = "anthropic" | "openai" | "gemini" | "openrouter"

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  model: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string }

export interface LLMMessage {
  role: "user" | "assistant" | "system" | "tool"
  content: string | ContentPart[]
  /** For role=assistant: thinking/reasoning content */
  thinking?: string
  /** For role=tool: the tool call id this result belongs to */
  toolCallId?: string
  /** For role=tool: the tool name */
  toolName?: string
  /** For role=assistant: tool calls made by the assistant (needed to reconstruct the message on the second turn) */
  toolCalls?: ToolCall[]
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: JSONSchema
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface StreamEvent {
  type: "text" | "thinking" | "tool_call" | "tool_calls_done" | "tool_result" | "done" | "error"
  content?: string
  toolCall?: ToolCall
  toolResult?: { id: string; result: string }
  usage?: { input: number; output: number }
  error?: string
}

// ── Stored Conversation types ────────────────────────────────────────────────

export interface TabInfo {
  id: number
  title: string
  url?: string
}

export interface StoredToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result: string
}

export interface StoredMessage {
  role: "user" | "assistant" | "tool"
  content: string
  thinking?: string
  toolCalls?: StoredToolCall[]
  toolCallId?: string
  toolName?: string
  timestamp: number
  /** Associated tab IDs (only for role=user) */
  associatedTabIds?: number[]
}

export interface ConversationIndexEntry {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

// ── Tab Selection State ──────────────────────────────────────────────────────

export interface ConversationTabState {
  primaryTabId: number
  additionalTabIds: number[]
  primaryTabLocked: boolean
}
