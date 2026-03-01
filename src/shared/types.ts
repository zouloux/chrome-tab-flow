// Shared types for TabFlow extension

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
