// Settings types and defaults for TabFlow

import type { LLMProvider } from "./types"

// ── Settings Types ───────────────────────────────────────────────────────────

export interface Settings {
  // API Keys (one per provider)
  anthropicApiKey: string
  openaiApiKey: string
  geminiApiKey: string

  // Default provider & model
  defaultProvider: LLMProvider
  defaultModel: string

  // Preferences
  showReasoning: boolean
  maxTokens: number
  temperature: number
}

// ── Model Options by Provider ─────────────────────────────────────────────────

export const MODEL_OPTIONS: Record<LLMProvider, string[]> = {
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "o1",
    "o1-mini",
    "o3-mini",
  ],
  gemini: [
    "gemini-2.0-flash",
    "gemini-2.0-pro",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
  ],
}

// ── Default Settings ─────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  anthropicApiKey: "",
  openaiApiKey: "",
  geminiApiKey: "",
  defaultProvider: "anthropic",
  defaultModel: "claude-sonnet-4-20250514",
  showReasoning: false,
  maxTokens: 2048,
  temperature: 0.7,
}

// ── Storage Keys ─────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  SETTINGS: "tabflow:settings",
  CONVERSATIONS_INDEX: "tabflow:conversations_index",
  ACTIVE_CONVERSATION: "tabflow:activeConversation",
} as const
