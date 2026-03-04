// Settings types and defaults for TabFlow

import type { LLMProvider } from "./types"

// ── Settings Types ───────────────────────────────────────────────────────────

export interface Settings {
  apiKey: string
  provider: LLMProvider
  model: string
  maxTokens: number
  temperature: number
  thinking: boolean
}

// ── Model Options by Provider ─────────────────────────────────────────────────

export const MODEL_OPTIONS: Record<LLMProvider, string[]> = {
  anthropic: [
    "claude-sonnet-4-6",
    "claude-opus-4-6",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
  ],
  openai: [
    "gpt-5.2",
    "gpt-5.3-instant",
    "gpt-5.2-codex",
    "o3-mini",
    "o1",
    "o1-mini",
  ],
  gemini: [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-3-flash-preview",
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash-lite",
  ],
}

// ── Default Settings ─────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  maxTokens: 4096,
  temperature: 0.7,
  thinking: false,
}

// ── Storage Keys ─────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  SETTINGS: "tabflow:settings",
  CONVERSATIONS: "tabflow:conversations",
  ACTIVE_CONVERSATION: "tabflow:activeConversation",
} as const