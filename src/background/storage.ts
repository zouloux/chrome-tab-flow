// Chrome storage helpers for TabFlow - split storage strategy

import type { StoredMessage, StoredToolCall, ConversationIndexEntry } from "../shared/types"
import type { LLMMessage, ToolCall } from "../shared/types"
import { STORAGE_KEYS, DEFAULT_SETTINGS, type Settings } from "../shared/settings"
import {
  encryptApiKey,
  decryptApiKey,
  getDecryptedKey,
  setDecryptedKey,
  clearDecryptedCache,
} from "./encryption"

const API_KEY_FIELDS = [
  "anthropicApiKey",
  "openaiApiKey",
  "geminiApiKey",
  "openrouterApiKey",
] as const

type ApiKeyField = (typeof API_KEY_FIELDS)[number]

// ── Persisted Conversation ───────────────────────────────────────────────────

export interface StoredConversation {
  id: string
  title: string
  tabId: number
  tabUrl?: string
  messages: StoredMessage[]
  createdAt: number
  updatedAt: number
}

// ── Storage Keys Type ────────────────────────────────────────────────────────

const CONVERSATION_KEY_PREFIX = "conversation_"

function makeConversationKey(id: string): string {
  return `${CONVERSATION_KEY_PREFIX}${id}`
}

// ── Settings ──────────────────────────────────────────────────────────────────

interface StoredSettings {
  anthropicApiKeyEnc?: string
  openaiApiKeyEnc?: string
  geminiApiKeyEnc?: string
  openrouterApiKeyEnc?: string
  defaultProvider: Settings["defaultProvider"]
  defaultModel: string
  showReasoning: boolean
  maxTokens: number
  temperature: number
}

function providerFromKeyField(field: ApiKeyField): string {
  return field.replace("ApiKey", "")
}

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS)
  const stored = result[STORAGE_KEYS.SETTINGS] as StoredSettings | undefined

  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    defaultProvider: stored?.defaultProvider ?? DEFAULT_SETTINGS.defaultProvider,
    defaultModel: stored?.defaultModel ?? DEFAULT_SETTINGS.defaultModel,
    showReasoning: stored?.showReasoning ?? DEFAULT_SETTINGS.showReasoning,
    maxTokens: stored?.maxTokens ?? DEFAULT_SETTINGS.maxTokens,
    temperature: stored?.temperature ?? DEFAULT_SETTINGS.temperature,
  }

  for (const field of API_KEY_FIELDS) {
    const encField = `${field}Enc` as keyof StoredSettings
    const encrypted = stored?.[encField] as string | undefined
    const provider = providerFromKeyField(field)
    
    if (encrypted) {
      const cached = getDecryptedKey(provider)
      if (cached) {
        settings[field] = cached
      } else {
        try {
          const decrypted = await decryptApiKey(encrypted)
          settings[field] = decrypted
          setDecryptedKey(provider, decrypted)
        } catch {
          settings[field] = ""
        }
      }
    }
  }

  return settings
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  const current = await getSettings()
  const updated = { ...current, ...settings }

  const toStore: StoredSettings = {
    defaultProvider: updated.defaultProvider,
    defaultModel: updated.defaultModel,
    showReasoning: updated.showReasoning,
    maxTokens: updated.maxTokens,
    temperature: updated.temperature,
  }

  for (const field of API_KEY_FIELDS) {
    const value = updated[field]
    const provider = providerFromKeyField(field)
    
    if (value && value.length > 0) {
      const encrypted = await encryptApiKey(value)
      if (field === "anthropicApiKey") toStore.anthropicApiKeyEnc = encrypted
      else if (field === "openaiApiKey") toStore.openaiApiKeyEnc = encrypted
      else if (field === "geminiApiKey") toStore.geminiApiKeyEnc = encrypted
      else if (field === "openrouterApiKey") toStore.openrouterApiKeyEnc = encrypted
      setDecryptedKey(provider, value)
    }
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: toStore })
  return updated
}

export function clearApiKeyCache(): void {
  clearDecryptedCache()
}

// ── Conversation Index ────────────────────────────────────────────────────────

export async function getConversationIndex(): Promise<ConversationIndexEntry[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CONVERSATIONS_INDEX)
  const index = result[STORAGE_KEYS.CONVERSATIONS_INDEX]
  return Array.isArray(index) ? index : []
}

async function saveConversationIndex(index: ConversationIndexEntry[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.CONVERSATIONS_INDEX]: index })
}

async function addToIndex(entry: ConversationIndexEntry): Promise<void> {
  const index = await getConversationIndex()
  const existingIdx = index.findIndex((e) => e.id === entry.id)
  if (existingIdx >= 0) {
    index[existingIdx] = entry
  } else {
    index.unshift(entry)
  }
  await saveConversationIndex(index)
}

async function removeFromIndex(id: string): Promise<void> {
  const index = await getConversationIndex()
  const filtered = index.filter((e) => e.id !== id)
  await saveConversationIndex(filtered)
}

// ── Conversations ────────────────────────────────────────────────────────────

export async function getConversations(): Promise<ConversationIndexEntry[]> {
  return getConversationIndex()
}

export async function getConversation(id: string): Promise<StoredConversation | undefined> {
  const key = makeConversationKey(id)
  const result = await chrome.storage.local.get(key)
  return result[key] as StoredConversation | undefined
}

export async function saveConversation(conv: StoredConversation): Promise<void> {
  const key = makeConversationKey(conv.id)
  await chrome.storage.local.set({ [key]: conv })
  
  await addToIndex({
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  })
}

export async function deleteConversationFromStorage(id: string): Promise<void> {
  const key = makeConversationKey(id)
  await chrome.storage.local.remove(key)
  await removeFromIndex(id)
}

// ── Active Conversation ──────────────────────────────────────────────────────

export async function getActiveConversationId(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_CONVERSATION)
  const id = result[STORAGE_KEYS.ACTIVE_CONVERSATION]
  return typeof id === "string" ? id : null
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

// ── Message Conversion Helpers ────────────────────────────────────────────────

export function llmMessageToStored(msg: LLMMessage, timestamp: number): StoredMessage {
  const content = typeof msg.content === "string"
    ? msg.content
    : msg.content.map((p) => (p.type === "text" ? p.text : "[image]")).join("")
  
  const stored: StoredMessage = {
    role: msg.role as "user" | "assistant" | "tool",
    content,
    timestamp,
  }
  
  if (msg.role === "tool") {
    stored.toolCallId = msg.toolCallId
    stored.toolName = msg.toolName
  }
  
  if (msg.role === "assistant" && msg.toolCalls) {
    stored.toolCalls = msg.toolCalls.map((tc): StoredToolCall => ({
      id: tc.id,
      name: tc.name,
      arguments: tc.arguments,
      result: "",
    }))
  }
  
  return stored
}

export function storedMessageToLLM(msg: StoredMessage): LLMMessage {
  const llm: LLMMessage = {
    role: msg.role,
    content: msg.content,
  }
  
  if (msg.role === "tool") {
    llm.toolCallId = (msg as StoredMessage & { toolCallId?: string }).toolCallId
    llm.toolName = (msg as StoredMessage & { toolName?: string }).toolName
  }
  
  if (msg.role === "assistant" && msg.toolCalls) {
    llm.toolCalls = msg.toolCalls.map((tc): ToolCall => ({
      id: tc.id,
      name: tc.name,
      arguments: tc.arguments,
    }))
  }
  
  return llm
}

// ── Storage Usage Check ──────────────────────────────────────────────────────

export async function getStorageUsage(): Promise<{ used: number; quota: number }> {
  const data = await chrome.storage.local.getBytesInUse()
  return {
    used: data,
    quota: chrome.storage.local.QUOTA_BYTES,
  }
}

// ── Clear All Storage (for debugging) ────────────────────────────────────────

export async function clearAllStorage(): Promise<void> {
  await chrome.storage.local.clear()
}
