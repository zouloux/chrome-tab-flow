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

  // Ref to current streaming assistant message id
  const streamingMsgIdRef = useRef<string | null>(null)

  // Load stored conversation messages into UI format
  const loadMessages = useCallback((conv: StoredConversation) => {
    const uiMessages: UIMessage[] = []

    for (const msg of conv.messages) {
      if (msg.role === "user") {
        const text = typeof msg.content === "string"
          ? msg.content
          : msg.content.map((p) => (p.type === "text" ? p.text : "[image]")).join("")
        uiMessages.push({
          id: crypto.randomUUID(),
          role: "user",
          text,
        })
      } else if (msg.role === "assistant") {
        const text = typeof msg.content === "string"
          ? msg.content
          : msg.content.map((p) => (p.type === "text" ? p.text : "")).join("")

        const toolCalls: UIToolCall[] = (msg.toolCalls ?? []).map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
          result: undefined,
          done: true,
        }))

        // Attach tool results
        for (const toolCall of toolCalls) {
          const resultMsg = conv.messages.find(
            (m) => m.role === "tool" && m.toolCallId === toolCall.id
          )
          if (resultMsg) {
            toolCall.result = typeof resultMsg.content === "string"
              ? resultMsg.content
              : JSON.stringify(resultMsg.content)
          }
        }

        if (text || toolCalls.length > 0) {
          uiMessages.push({
            id: crypto.randomUUID(),
            role: "assistant",
            text,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          })
        }
      }
      // Skip "tool" role messages - they're shown inside the corresponding assistant UIMessage
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
              const newId = crypto.randomUUID()
              streamingMsgIdRef.current = newId
              return [
                ...prev,
                makeAssistantMessage({ id: newId, role: "assistant", text: event.content, isStreaming: true }),
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
              const newId = crypto.randomUUID()
              streamingMsgIdRef.current = newId
              return [
                ...prev,
                makeAssistantMessage({
                  id: newId,
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
              const newId = crypto.randomUUID()
              streamingMsgIdRef.current = newId
              return [
                ...prev,
                makeAssistantMessage({
                  id: newId,
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

  const sendMessage = useCallback(async (text: string) => {
    if (!conversationId || !text.trim()) return

    setError(null)

    // Add user message immediately to UI
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: text.trim() },
    ])

    setIsStreaming(true)
    streamingMsgIdRef.current = null

    try {
      const res = await sendToBackground<
        { conversationId: string; message: string },
        { started: boolean }
      >("llm:stream", { conversationId, message: text.trim() })

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
    error,
    sendMessage,
    abort,
    loadMessages,
    clearMessages,
  }
}


