// LLM Orchestration - handles streaming, tool calls, and message flow

import type { LLMMessage, ToolCall, StreamEvent } from "../shared/types"
import { streamLLM } from "../shared/llms"
import { getToolsForLLM } from "../shared/tools"
import { buildSystemPrompt } from "../shared/system-prompt"
import type { Settings } from "../shared/settings"
import type { ConversationState } from "./state"
import { executeTool } from "./tools"

// ── Send Chunk to Side Panel ─────────────────────────────────────────────────

function sendChunk(conversationId: string, event: StreamEvent): void {
  chrome.runtime.sendMessage({
    type: "llm:chunk",
    payload: {
      conversationId,
      event,
    },
  }).catch(() => {
    // Side panel might not be open, ignore
  })
}

// ── Send Done to Side Panel ──────────────────────────────────────────────────

function sendDone(conversationId: string, error?: string): void {
  chrome.runtime.sendMessage({
    type: "llm:done",
    payload: {
      conversationId,
      error,
    },
  }).catch(() => {
    // Side panel might not be open, ignore
  })
}

// ── Build LLM Config ─────────────────────────────────────────────────────────

interface LegacySettings {
  provider: string
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
  thinking: boolean
}

function isLegacySettings(s: Settings | LegacySettings): s is LegacySettings {
  return "apiKey" in s
}

async function buildLLMConfig(settings: Settings | LegacySettings, associatedTabIds?: number[]) {
  let provider: string
  let model: string
  let apiKey: string

  if (isLegacySettings(settings)) {
    provider = settings.provider
    model = settings.model
    apiKey = settings.apiKey
  } else {
    provider = settings.defaultProvider
    model = settings.defaultModel
    // Get API key based on provider
    switch (provider) {
      case "anthropic":
        apiKey = settings.anthropicApiKey
        break
      case "openai":
        apiKey = settings.openaiApiKey
        break
      case "gemini":
        apiKey = settings.geminiApiKey
        break
      case "openrouter":
        apiKey = settings.openrouterApiKey
        break
      default:
        apiKey = ""
    }
  }

  // Get tab info for system prompt
  let tabsInfo: import("../shared/types").TabInfo[] | undefined
  if (associatedTabIds && associatedTabIds.length > 0) {
    try {
      const tabs = await chrome.tabs.query({})
      tabsInfo = tabs
        .filter((tab) => tab.id && associatedTabIds.includes(tab.id))
        .map((tab) => ({
          id: tab.id!,
          title: tab.title ?? "Untitled",
          url: tab.url,
        }))
    } catch (e) {
      console.warn("[TabFlow] Failed to fetch tab info for system prompt:", e)
    }
  }

  return {
    provider: provider as "anthropic" | "openai" | "gemini" | "openrouter",
    apiKey,
    model,
    maxTokens: settings.maxTokens,
    temperature: settings.temperature,
    systemPrompt: buildSystemPrompt(tabsInfo),
  }
}

// ── Run Conversation Loop ────────────────────────────────────────────────────

export async function runConversation(
  conversation: ConversationState,
  settings: Settings | LegacySettings,
  userMessage: string,
  associatedTabIds?: number[]
): Promise<void> {
  const tools = getToolsForLLM()
  const config = await buildLLMConfig(settings, associatedTabIds)

  // Add user message
  conversation.messages.push({
    role: "user",
    content: userMessage,
  })

  // Use first tab for tool execution (for backward compatibility)
  if (associatedTabIds && associatedTabIds.length > 0) {
    conversation.tabId = associatedTabIds[0]!
  }

  // Create abort controller
  const abortController = new AbortController()
  conversation.isStreaming = true
  conversation.pendingToolCalls = []

  try {
    await runLLMLoop(conversation, config, tools, abortController.signal)
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e)
    sendDone(conversation.id, errorMsg)
  } finally {
    conversation.isStreaming = false
  }
}

// ── LLM Loop (handles tool call cycles) ───────────────────────────────────────

async function runLLMLoop(
  conversation: ConversationState,
  config: ReturnType<typeof buildLLMConfig>,
  tools: ReturnType<typeof getToolsForLLM>,
  signal: AbortSignal
): Promise<void> {
  let shouldContinue = true

  while (shouldContinue) {
    shouldContinue = false
    conversation.pendingToolCalls = []

    let textContent = ""
    let thinkingContent = ""

    for await (const event of streamLLM(config, conversation.messages, tools, {
      signal,
      thinking: config.temperature === 1,
    })) {
      if (signal.aborted) {
        sendDone(conversation.id)
        return
      }

      sendChunk(conversation.id, event)

      if (event.type === "text" && event.content) {
        textContent += event.content
      }

      if (event.type === "thinking" && event.content) {
        thinkingContent += event.content
      }

      if (event.type === "tool_call" && event.toolCall) {
        conversation.pendingToolCalls.push(event.toolCall)
      }

      if (event.type === "tool_calls_done") {
        const toolResults = await executeToolCalls(
          conversation.pendingToolCalls,
          conversation.tabId
        )

        conversation.messages.push({
          role: "assistant",
          content: textContent,
          thinking: thinkingContent || undefined,
          toolCalls: conversation.pendingToolCalls.length > 0 
            ? conversation.pendingToolCalls 
            : undefined,
        })

        for (const result of toolResults) {
          conversation.messages.push({
            role: "tool",
            toolCallId: result.toolCallId,
            toolName: result.toolName,
            content: result.content,
          })
        }

        shouldContinue = true
        break
      }

      if (event.type === "done") {
        conversation.messages.push({
          role: "assistant",
          content: textContent,
          thinking: thinkingContent || undefined,
        })
        sendDone(conversation.id)
      }

      if (event.type === "error") {
        sendDone(conversation.id, event.error)
        return
      }
    }
  }
}

// ── Execute Tool Calls ───────────────────────────────────────────────────────

interface ToolResult {
  toolCallId: string
  toolName: string
  content: string
}

async function executeToolCalls(
  toolCalls: ToolCall[],
  tabId: number
): Promise<ToolResult[]> {
  const results: ToolResult[] = []

  for (const tc of toolCalls) {
    try {
      const result = await executeTool(tc.name, tc.arguments, tabId)
      results.push({
        toolCallId: tc.id,
        toolName: tc.name,
        content: JSON.stringify(result),
      })
    } catch (e) {
      results.push({
        toolCallId: tc.id,
        toolName: tc.name,
        content: JSON.stringify({
          success: false,
          error: e instanceof Error ? e.message : String(e),
        }),
      })
    }
  }

  return results
}