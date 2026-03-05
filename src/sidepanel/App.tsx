// TabFlow side panel React app - main component

import { useState, useCallback, useEffect } from "react"
import { Header } from "./components/Header"
import { MessageList } from "./components/MessageList"
import { InputArea } from "./components/InputArea"
import { ConversationList } from "./components/ConversationList"
import { SettingsPanel } from "./components/SettingsPanel"
import { useChat } from "./hooks/useChat"
import { useConversations } from "./hooks/useConversations"

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
}

function ChatView({ conversationId, onNewChat }: ChatViewProps) {
  const { messages, isStreaming, isLoading, error, sendMessage, abort } = useChat(conversationId)
  const [inputValue, setInputValue] = useState("")

  const handleSend = useCallback(() => {
    if (!conversationId || !inputValue.trim() || isStreaming) return
    sendMessage(inputValue)
    setInputValue("")
  }, [conversationId, inputValue, isStreaming, sendMessage])

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

  return (
    <>
      <MessageList messages={messages} />
      {error && <ErrorBanner message={error} />}
      <InputArea
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onStop={abort}
        isStreaming={isStreaming}
        disabled={!conversationId}
      />
    </>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const [view, setView] = useState<"chat" | "settings">("chat")
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

  if (view === "settings") {
    return <SettingsPanel onBack={() => setView("chat")} />
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <Header
        onSettings={() => setView("settings")}
        onNewChat={handleNewChat}
      />

      <ChatView
        conversationId={activeId}
        onNewChat={handleNewChat}
      />

      <ConversationList
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectConversation}
        onDelete={deleteConversation}
        onNew={handleNewChat}
      />
    </div>
  )
}
