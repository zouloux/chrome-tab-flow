// Hook for managing conversation list and active conversation

import { useState, useEffect, useCallback } from "react"
import { sendToBackground } from "../../shared/messages"
import type { StoredConversation } from "../../background/storage"

export function useConversations() {
  const [conversations, setConversations] = useState<StoredConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await sendToBackground<null, StoredConversation[]>("conversation:list", null)
      if (res.success && res.data) {
        setConversations(res.data)
      }
    } catch (e) {
      console.error("[TabFlow] useConversations: failed to list", e)
    }
  }, [])

  useEffect(() => {
    async function init() {
      await refresh()
      setLoading(false)
    }
    init()
  }, [refresh])

  const newConversation = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const res = await sendToBackground<{ tabId?: number; tabUrl?: string }, StoredConversation>(
        "conversation:new",
        { tabId: tab?.id, tabUrl: tab?.url }
      )
      if (res.success && res.data) {
        await refresh()
        setActiveId(res.data.id)
        return res.data
      }
    } catch (e) {
      console.error("[TabFlow] useConversations: failed to create", e)
    }
    return null
  }, [refresh])

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await sendToBackground<{ id: string }, StoredConversation>("conversation:load", { id })
      if (res.success && res.data) {
        setActiveId(id)
        return res.data
      }
    } catch (e) {
      console.error("[TabFlow] useConversations: failed to load", e)
    }
    return null
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    try {
      const res = await sendToBackground<{ id: string }, { deleted: boolean }>("conversation:delete", { id })
      if (res.success) {
        await refresh()
        if (activeId === id) {
          setActiveId(null)
        }
      }
    } catch (e) {
      console.error("[TabFlow] useConversations: failed to delete", e)
    }
  }, [refresh, activeId])

  return {
    conversations,
    activeId,
    setActiveId,
    loading,
    refresh,
    newConversation,
    loadConversation,
    deleteConversation,
  }
}
