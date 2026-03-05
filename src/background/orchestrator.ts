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

function buildLLMConfig(settings: Settings | LegacySettings) {
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

  return {
    provider: provider as "anthropic" | "openai" | "gemini" | "openrouter",
    apiKey,
    model,
    maxTokens: settings.maxTokens,
    temperature: settings.temperature,
    systemPrompt: buildSystemPrompt(),
  }
}

// ── Run Conversation Loop ────────────────────────────────────────────────────

export async function runConversation(
  conversation: ConversationState,
  settings: Settings | LegacySettings,
  userMessage: string
): Promise<void> {
  const tools = getToolsForLLM()
  const config = buildLLMConfig(settings)

  // Add user message
  conversation.messages.push({
    role: "user",
    content: userMessage,
  })

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

    // Stream LLM response
    for await (const event of streamLLM(config, conversation.messages, tools, {
      signal,
      thinking: config.temperature === 1, // Enable thinking mode for models that support it
    })) {
      if (signal.aborted) {
        sendDone(conversation.id)
        return
      }

      sendChunk(conversation.id, event)

      if (event.type === "tool_call" && event.toolCall) {
        conversation.pendingToolCalls.push(event.toolCall)
      }

      if (event.type === "tool_calls_done") {
        // Execute all pending tool calls
        const toolResults = await executeToolCalls(
          conversation.pendingToolCalls,
          conversation.tabId
        )

        // Append assistant message with tool calls
        const lastAssistantIdx = conversation.messages.length - 1 - conversation.messages.slice().reverse().findIndex((m) => m.role === "assistant")
        const lastAssistantMsg = lastAssistantIdx >= 0 ? conversation.messages[lastAssistantIdx] : undefined
        if (!lastAssistantMsg || !lastAssistantMsg.toolCalls) {
          // Create new assistant message
          const textContent = conversation.messages
            .filter((m) => m.role === "assistant")
            .reduce((acc, m) => {
              if (typeof m.content === "string") return acc + m.content
              return acc
            }, "")

          conversation.messages.push({
            role: "assistant",
            content: textContent || "",
            toolCalls: conversation.pendingToolCalls,
          })
        }

        // Append tool results
        for (const result of toolResults) {
          conversation.messages.push({
            role: "tool",
            toolCallId: result.toolCallId,
            toolName: result.toolName,
            content: result.content,
          })
        }

        // Continue the loop to get next LLM response
        shouldContinue = true
        break
      }

      if (event.type === "done") {
        // Finalize assistant message
        const lastUserIdx = conversation.messages.length - 1 - conversation.messages.slice().reverse().findIndex((m) => m.role === "user")
        const assistantMessages = conversation.messages.slice(lastUserIdx + 1)
        
        // If we had text content, ensure it's captured
        // The side panel handles assembling the streamed text
        
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