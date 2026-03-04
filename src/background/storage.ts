// Chrome storage helpers for TabFlow

import type { LLMMessage } from "../shared/types"
import { STORAGE_KEYS, DEFAULT_SETTINGS, type Settings } from "../shared/settings"

// ── Persisted Conversation ───────────────────────────────────────────────────

export interface StoredConversation {
  id: string
  title: string
  tabId: number
  tabUrl: string
  messages: LLMMessage[]
  createdAt: number
  updatedAt: number
}

// ── Storage Keys Type ────────────────────────────────────────────────────────

interface StorageData {
  [STORAGE_KEYS.SETTINGS]: Settings
  [STORAGE_KEYS.CONVERSATIONS]: StoredConversation[]
  [STORAGE_KEYS.ACTIVE_CONVERSATION]: string | null
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS)
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] }
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  const current = await getSettings()
  const updated = { ...current, ...settings }
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated })
  return updated
}

// ── Conversations ────────────────────────────────────────────────────────────

export async function getConversations(): Promise<StoredConversation[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CONVERSATIONS)
  return result[STORAGE_KEYS.CONVERSATIONS] ?? []
}

export async function saveConversation(conv: StoredConversation): Promise<void> {
  const conversations = await getConversations()
  const idx = conversations.findIndex((c) => c.id === conv.id)
  if (idx >= 0) {
    conversations[idx] = conv
  } else {
    conversations.unshift(conv)
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.CONVERSATIONS]: conversations })
}

export async function deleteConversationFromStorage(id: string): Promise<void> {
  const conversations = await getConversations()
  const filtered = conversations.filter((c) => c.id !== id)
  await chrome.storage.local.set({ [STORAGE_KEYS.CONVERSATIONS]: filtered })
}

export async function getConversation(id: string): Promise<StoredConversation | undefined> {
  const conversations = await getConversations()
  return conversations.find((c) => c.id === id)
}

// ── Active Conversation ──────────────────────────────────────────────────────

export async function getActiveConversationId(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_CONVERSATION)
  return result[STORAGE_KEYS.ACTIVE_CONVERSATION] ?? null
}

export async function setActiveConversationId(id: string | null): Promise<void> {
  if (id === null) {
    await chrome.storage.local.remove(STORAGE_KEYS.ACTIVE_CONVERSATION)
  } else {
    await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_CONVERSATION]: id })
  }
}

// ── Generate Title from First Message ────────────────────────────────────────

export function generateTitle(message: string): string {
  const cleaned = message.trim().slice(0, 100)
  const words = cleaned.split(/\s+/).slice(0, 8)
  let title = words.join(" ")
  if (cleaned.length > title.length) {
    title += "..."
  }
  return title || "New Conversation"
}

// ── Clear All Storage (for debugging) ────────────────────────────────────────

export async function clearAllStorage(): Promise<void> {
  await chrome.storage.local.clear()
}