// Chat state management hook - handles streaming messages from background

import { useState, useEffect, useRef, useCallback } from "react"
import { sendToBackground } from "../../shared/messages"
import type { StreamEvent } from "../../shared/types"
import type { StoredConversation } from "../../background/storage"

// ── UI Message Types ──────────────────────────────────────────────────────────

export type UIMessageRole = "user" | "assistant"

export interface UIToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: string
  done: boolean
}

export interface UIMessage {
  id: string
  role: UIMessageRole
  text: string
  thinking?: string
  toolCalls?: UIToolCall[]
  isStreaming?: boolean
  /** Associated tab IDs (only for role=user) */
  associatedTabIds?: number[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAssistantMessage(partial: Partial<UIMessage> & { id: string; role: UIMessageRole }): UIMessage {
  return {
    text: "",
    ...partial,
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useChat(conversationId: string | null) {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Ref to current streaming assistant message id
  const streamingMsgIdRef = useRef<string | null>(null)
  const currentConvIdRef = useRef<string | null>(null)

  // Load stored conversation messages into UI format
  const loadMessages = useCallback((conv: StoredConversation) => {
    const uiMessages: UIMessage[] = []

    for (const msg of conv.messages) {
      if (msg.role === "user") {
        uiMessages.push({
          id: crypto.randomUUID(),
          role: "user",
          text: msg.content,
          associatedTabIds: msg.associatedTabIds,
        })
      } else if (msg.role === "assistant") {
        const toolCalls: UIToolCall[] = (msg.toolCalls ?? []).map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
          result: tc.result,
          done: true,
        }))

        // Find tool results for this assistant message
        // Tool results are in subsequent "tool" role messages
        // We need to look ahead in the conversation
        const msgIdx = conv.messages.indexOf(msg)
        for (const tc of toolCalls) {
          for (let i = msgIdx + 1; i < conv.messages.length; i++) {
            const nextMsg = conv.messages[i]
            if (nextMsg?.role === "tool" && nextMsg.toolCallId === tc.id) {
              tc.result = nextMsg.content
              break
            }
            if (nextMsg?.role !== "tool") {
              break
            }
          }
        }

        if (msg.content || toolCalls.length > 0) {
          uiMessages.push({
            id: crypto.randomUUID(),
            role: "assistant",
            text: msg.content,
            thinking: msg.thinking,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          })
        }
      }
    }

    setMessages(uiMessages)
    setIsStreaming(false)
    setError(null)
    streamingMsgIdRef.current = null
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setIsStreaming(false)
    setError(null)
    streamingMsgIdRef.current = null
  }, [])

  // Load conversation when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      clearMessages()
      currentConvIdRef.current = null
      return
    }

    // Skip if already loaded this conversation
    if (currentConvIdRef.current === conversationId) {
      return
    }

    async function loadConversationData() {
      setIsLoading(true)
      try {
        const res = await sendToBackground<{ id: string }, StoredConversation>(
          "conversation:load",
          { id: conversationId! }
        )
        if (res.success && res.data) {
          loadMessages(res.data)
          currentConvIdRef.current = conversationId
        }
      } catch (e) {
        console.error("[TabFlow] useChat: failed to load conversation", e)
        setError("Failed to load conversation")
      } finally {
        setIsLoading(false)
      }
    }

    loadConversationData()
  }, [conversationId, loadMessages, clearMessages])

  // ── Listen for streaming chunks from background ───────────────────────────

  useEffect(() => {
    if (!conversationId) return

    function handleMessage(message: { type: string; payload: unknown }) {
      if (message.type === "llm:chunk") {
        const payload = message.payload as {
          conversationId: string
          event: StreamEvent
        }
        if (payload.conversationId !== conversationId) return

        const event = payload.event

        // Pre-compute new message ID if needed (prevents race conditions in batched updates)
        const currentMsgId = streamingMsgIdRef.current
        const eventsNeedingMessage = ["text", "thinking", "tool_call"] as const
        const needsNewMessage = 
          eventsNeedingMessage.includes(event.type as typeof eventsNeedingMessage[number]) && 
          !currentMsgId
        
        // Set ref BEFORE calling setMessages so subsequent events see it
        const newMsgId = needsNewMessage ? crypto.randomUUID() : null
        if (newMsgId) {
          streamingMsgIdRef.current = newMsgId
        }

        setMessages((prev) => {
          // Find the current streaming assistant message index
          const msgId = streamingMsgIdRef.current
          const existingIdx = msgId ? prev.findIndex((m) => m.id === msgId) : -1
          const existing = existingIdx >= 0 ? prev[existingIdx] : undefined

          if (event.type === "text" && event.content) {
            if (existing) {
              const updated = [...prev]
              updated[existingIdx] = { ...existing, text: existing.text + event.content }
              return updated
            } else {
              // Use the pre-computed ID (either newMsgId or msgId if set)
              const id = newMsgId ?? msgId ?? crypto.randomUUID()
              if (!streamingMsgIdRef.current) streamingMsgIdRef.current = id
              return [
                ...prev,
                makeAssistantMessage({ id, role: "assistant", text: event.content, isStreaming: true }),
              ]
            }
          }

          if (event.type === "thinking" && event.content) {
            if (existing) {
              const updated = [...prev]
              updated[existingIdx] = {
                ...existing,
                thinking: (existing.thinking ?? "") + event.content,
              }
              return updated
            } else {
              const id = newMsgId ?? msgId ?? crypto.randomUUID()
              if (!streamingMsgIdRef.current) streamingMsgIdRef.current = id
              return [
                ...prev,
                makeAssistantMessage({
                  id,
                  role: "assistant",
                  thinking: event.content,
                  isStreaming: true,
                }),
              ]
            }
          }

          if (event.type === "tool_call" && event.toolCall) {
            const tc = event.toolCall
            if (existing) {
              const updated = [...prev]
              const existingCalls = existing.toolCalls ?? []
              const alreadyExists = existingCalls.some((t) => t.id === tc.id)
              if (!alreadyExists) {
                updated[existingIdx] = {
                  ...existing,
                  toolCalls: [
                    ...existingCalls,
                    { id: tc.id, name: tc.name, arguments: tc.arguments, done: false },
                  ],
                }
              }
              return updated
            } else {
              const id = newMsgId ?? msgId ?? crypto.randomUUID()
              if (!streamingMsgIdRef.current) streamingMsgIdRef.current = id
              return [
                ...prev,
                makeAssistantMessage({
                  id,
                  role: "assistant",
                  toolCalls: [{ id: tc.id, name: tc.name, arguments: tc.arguments, done: false }],
                  isStreaming: true,
                }),
              ]
            }
          }

          // tool_calls_done - mark all tool calls as done
          if (event.type === "tool_calls_done" && existing) {
            const updated = [...prev]
            updated[existingIdx] = {
              ...existing,
              toolCalls: (existing.toolCalls ?? []).map((tc) => ({ ...tc, done: true })),
            }
            return updated
          }

          // tool_result - update the result for a specific tool call
          if (event.type === "tool_result" && event.toolResult && existing) {
            const updated = [...prev]
            const toolCalls = existing.toolCalls ?? []
            const tcIdx = toolCalls.findIndex((tc) => tc.id === event.toolResult!.id)
            if (tcIdx >= 0) {
              const newToolCalls = [...toolCalls]
              newToolCalls[tcIdx] = { ...newToolCalls[tcIdx]!, result: event.toolResult.result }
              updated[existingIdx] = { ...existing, toolCalls: newToolCalls }
            }
            return updated
          }

          return prev
        })
      }

      if (message.type === "llm:done") {
        const payload = message.payload as { conversationId: string; error?: string }
        if (payload.conversationId !== conversationId) return

        setIsStreaming(false)
        if (payload.error) {
          setError(payload.error)
        }

        // Mark streaming message as done
        const msgId = streamingMsgIdRef.current
        if (msgId) {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === msgId)
            const msg = idx >= 0 ? prev[idx] : undefined
            if (msg) {
              const updated = [...prev]
              updated[idx] = { ...msg, isStreaming: false }
              return updated
            }
            return prev
          })
          streamingMsgIdRef.current = null
        }
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [conversationId])

  // ── Send a message ────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string, tabIds?: number[]) => {
    if (!conversationId || !text.trim()) return

    setError(null)

    // Add user message immediately to UI
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: text.trim(), associatedTabIds: tabIds },
    ])

    setIsStreaming(true)
    streamingMsgIdRef.current = null

    try {
      const res = await sendToBackground<
        { conversationId: string; message: string; tabIds?: number[] },
        { started: boolean }
      >("llm:stream", { conversationId, message: text.trim(), tabIds })

      if (!res.success) {
        setError(res.error ?? "Failed to start stream")
        setIsStreaming(false)
      }
    } catch (e) {
      setError(String(e))
      setIsStreaming(false)
    }
  }, [conversationId])

  // ── Abort streaming ───────────────────────────────────────────────────────

  const abort = useCallback(async () => {
    if (!conversationId) return
    try {
      await sendToBackground<{ conversationId: string }, { aborted: boolean }>(
        "llm:abort",
        { conversationId }
      )
    } catch (e) {
      console.error("[TabFlow] useChat: abort failed", e)
    }
  }, [conversationId])

  return {
    messages,
    isStreaming,
    isLoading,
    error,
    sendMessage,
    abort,
    loadMessages,
    clearMessages,
  }
}
