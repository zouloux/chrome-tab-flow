// TabFlow side panel React app - main component

import { useState, useCallback, useEffect } from "react"
import { Header } from "./components/Header"
import { MessageList } from "./components/MessageList"
import { InputArea } from "./components/InputArea"
import { ConversationList } from "./components/ConversationList"
import { SettingsPanel } from "./components/SettingsPanel"
import { ConversationHeader } from "./components/ConversationHeader"
import { useChat } from "./hooks/useChat"
import { useConversations } from "./hooks/useConversations"
import { useSettings } from "./hooks/useSettings"
import { sendToBackground } from "../shared/messages"
import type { TabInfo } from "../shared/types"
import type { StoredConversation } from "../background/storage"

// ── Loading Spinner ────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ color: "#666666" }}
    >
      <div className="animate-spin">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

// ── Error Banner ──────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="px-3 py-2 text-xs flex-shrink-0"
      style={{
        backgroundColor: "#1a0a0a",
        borderTop: "1px solid #3b0000",
        color: "#ef4444",
      }}
    >
      {message}
    </div>
  )
}

// ── Chat View ─────────────────────────────────────────────────────────────────

interface ChatViewProps {
  conversationId: string | null
  onNewChat: () => void
  settings?: ReturnType<typeof useSettings>["settings"]
}

function ChatView({ conversationId, onNewChat, settings }: ChatViewProps) {
  const { messages, isStreaming, isLoading, error, sendMessage, abort } = useChat(conversationId)
  const [inputValue, setInputValue] = useState("")
  const [primaryTabId, setPrimaryTabId] = useState<number | null>(null)
  const [additionalTabIds, setAdditionalTabIds] = useState<number[]>([])
  const [primaryTabLocked, setPrimaryTabLocked] = useState(false)
  const [primaryTabInfo, setPrimaryTabInfo] = useState<TabInfo | null>(null)
  const [additionalTabsInfo, setAdditionalTabsInfo] = useState<TabInfo[]>([])

  // Load conversation tab state
  useEffect(() => {
    if (!conversationId) {
      setPrimaryTabId(null)
      setAdditionalTabIds([])
      setPrimaryTabLocked(false)
      return
    }

    async function loadConvTabState() {
      const res = await sendToBackground<{ id: string }, StoredConversation>(
        "conversation:load",
        { id: conversationId! }
      )
      if (res.success && res.data) {
        const conv = res.data
        const locked = conv.primaryTabLocked ?? false
        const associated = conv.associatedTabIds ?? [conv.tabId]

        setPrimaryTabId(associated[0] ?? conv.tabId)
        setAdditionalTabIds(associated.slice(1))
        setPrimaryTabLocked(locked)

        // Fetch tab info
        const tabs = await chrome.tabs.query({})
        const primaryTab = tabs.find(t => t.id === associated[0])
        const additionalTabs = tabs.filter(t => t.id && associated.slice(1).includes(t.id))

        if (primaryTab && primaryTab.id) {
          setPrimaryTabInfo({
            id: primaryTab.id,
            title: primaryTab.title ?? "Untitled",
            url: primaryTab.url,
          })
        }

        setAdditionalTabsInfo(
          additionalTabs.map(t => ({
            id: t.id!,
            title: t.title ?? "Untitled",
            url: t.url,
          }))
        )
      }
    }

    loadConvTabState()
  }, [conversationId])

  // Auto-track primary tab before first message
  useEffect(() => {
    if (!conversationId || primaryTabLocked || messages.length > 0) return

    const listener = (activeInfo: chrome.tabs.TabActiveInfo) => {
      setPrimaryTabId(activeInfo.tabId)
      chrome.tabs.get(activeInfo.tabId).then(tab => {
        if (tab.id) {
          setPrimaryTabInfo({
            id: tab.id,
            title: tab.title ?? "Untitled",
            url: tab.url,
          })
        }
      })
    }

    chrome.tabs.onActivated.addListener(listener)
    return () => chrome.tabs.onActivated.removeListener(listener)
  }, [conversationId, primaryTabLocked, messages.length])

  const handleSend = useCallback(async (tabIds?: number[]) => {
    if (!conversationId || !inputValue.trim() || isStreaming) return

    // Lock primary tab on first message
    if (messages.length === 0 && !primaryTabLocked) {
      setPrimaryTabLocked(true)

      // Update stored conversation
      const res = await sendToBackground<{ id: string }, StoredConversation>(
        "conversation:load",
        { id: conversationId }
      )
      if (res.success && res.data) {
        const conv = res.data
        conv.primaryTabLocked = true
        conv.associatedTabIds = [primaryTabId!, ...additionalTabIds]
        await sendToBackground("conversation:save", conv)
      }
    }

    // Send with all associated tabs
    const allTabIds = [primaryTabId!, ...additionalTabIds]
    sendMessage(inputValue, allTabIds)
    setInputValue("")
  }, [conversationId, inputValue, isStreaming, messages.length, primaryTabLocked, primaryTabId, additionalTabIds, sendMessage])

  const handleRemoveAdditionalTab = useCallback((tabId: number) => {
    setAdditionalTabIds(prev => prev.filter(id => id !== tabId))
    setAdditionalTabsInfo(prev => prev.filter(t => t.id !== tabId))
  }, [])

  const handleAddTab = useCallback((tabId: number) => {
    if (additionalTabIds.length < 2 && !additionalTabIds.includes(tabId)) {
      setAdditionalTabIds(prev => [...prev, tabId])

      // Fetch tab info
      chrome.tabs.get(tabId).then(tab => {
        if (tab.id) {
          setAdditionalTabsInfo(prev => [
            ...prev,
            {
              id: tab.id!,
              title: tab.title ?? "Untitled",
              url: tab.url,
            },
          ])
        }
      })
    }
  }, [additionalTabIds])

  // Show loading spinner while loading conversation
  if (isLoading) {
    return <LoadingSpinner />
  }

  // Show placeholder if no conversation selected
  if (!conversationId) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center"
        style={{ color: "#666666" }}
      >
        <div className="text-sm" style={{ color: "#a0a0a0" }}>No conversation selected</div>
        <button
          onClick={onNewChat}
          className="text-xs px-3 py-1.5 rounded-md transition-colors"
          style={{ backgroundColor: "#1e1e1e", color: "#60a5fa", border: "1px solid #2a2a2a" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2a2a2a" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1e1e1e" }}
        >
          Start new conversation
        </button>
      </div>
    )
  }

  const hasMessages = messages.length > 0

  return (
    <>
      {hasMessages && primaryTabInfo && (
        <ConversationHeader
          primaryTab={primaryTabInfo}
          additionalTabs={additionalTabsInfo}
          onRemoveAdditionalTab={handleRemoveAdditionalTab}
          primaryTabLocked={primaryTabLocked}
        />
      )}
      <MessageList messages={messages} settings={settings} />
      {error && <ErrorBanner message={error} />}
      <InputArea
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onStop={abort}
        isStreaming={isStreaming}
        disabled={!conversationId}
        selectedTabIds={additionalTabIds}
        onTabsChange={setAdditionalTabIds}
      />
    </>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const [view, setView] = useState<"chat" | "settings">("chat")
  const { settings } = useSettings()
  const {
    conversations,
    activeId,
    loading,
    newConversation,
    loadConversation,
    deleteConversation,
  } = useConversations()

  // Auto-create a conversation on first launch
  useEffect(() => {
    if (loading) return
    
    if (conversations.length === 0) {
      newConversation()
    } else if (!activeId) {
      // Load the most recent conversation
      const first = conversations[0]
      if (first) {
        loadConversation(first.id)
      }
    }
  }, [loading, conversations.length, activeId])

  const handleNewChat = useCallback(async () => {
    await newConversation()
  }, [newConversation])

  const handleSelectConversation = useCallback(async (id: string) => {
    await loadConversation(id)
  }, [loadConversation])

  return (
    <div
      className="flex flex-col h-screen relative"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <Header
        onSettings={() => setView("settings")}
        onNewChat={handleNewChat}
      />

      <ChatView
        conversationId={activeId}
        onNewChat={handleNewChat}
        settings={settings}
      />

      <ConversationList
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectConversation}
        onDelete={deleteConversation}
        onNew={handleNewChat}
      />

      {view === "settings" && (
        <div className="absolute inset-0 z-10 h-full">
          <SettingsPanel onBack={() => setView("chat")} />
        </div>
      )}
    </div>
  )
}
