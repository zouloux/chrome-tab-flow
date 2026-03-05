// Settings types and defaults for TabFlow

import type { LLMProvider } from "./types"

// ── Settings Types ───────────────────────────────────────────────────────────

export interface Settings {
  // API Keys (one per provider)
  anthropicApiKey: string
  openaiApiKey: string
  geminiApiKey: string
  openrouterApiKey: string

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
    "claude-opus-4-6",
    "claude-sonnet-4-6",
    //"claude-sonnet-4-5-20250929",
    "claude-haiku-4-6",
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "o3-mini",
    "o1",
  ],
  gemini: [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
  ],
  openrouter: [], // Populated dynamically from API
}

// ── Default Settings ─────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  anthropicApiKey: "",
  openaiApiKey: "",
  geminiApiKey: "",
  openrouterApiKey: "",
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
