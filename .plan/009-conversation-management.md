# Phase 9: Conversation Management

## Goal
Implement conversation history: create, list, load, delete, auto-title.

## Data Model
```ts
interface Conversation {
  id: string              // crypto.randomUUID()
  title: string           // Auto-generated from first user message or LLM summary
  createdAt: number       // timestamp
  updatedAt: number       // timestamp
  messages: StoredMessage[]
  tabUrl?: string         // URL when conversation started
}

interface StoredMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  thinking?: string       // Reasoning content if any
  toolCalls?: StoredToolCall[]
  timestamp: number
}

interface StoredToolCall {
  name: string
  arguments: Record<string, unknown>
  result: string
}
```

## Storage Strategy
- Index: `chrome.storage.local` key `conversations_index` = array of `{ id, title, createdAt, updatedAt }`
- Data: Each conversation stored as `conversation_{id}` in `chrome.storage.local`
- This split avoids loading all message data when just listing conversations
- Storage limit: ~10MB for `chrome.storage.local`. Warn if approaching limit.

## Auto-Title
- Initial title: first 50 chars of first user message
- After first assistant response, optionally ask LLM for a short title (3-5 words)
- Or simpler: just use first user message, truncated

## Conversation List UI
- Shown at bottom of the side panel or as a toggleable drawer
- Each item: title + relative date ("2 min ago", "Yesterday", "Jan 15")
- Click to load conversation
- Swipe or X button to delete
- "New Chat" button always visible at top

## Key Behaviors
- New conversation created automatically when user sends first prompt with no active conversation
- Switching conversations saves current state
- Deleting a conversation removes it from index and data storage
- Loading a conversation restores all messages in the chat view

## Files to Create
- `src/background/conversations.ts` - CRUD operations on chrome.storage
- `src/sidepanel/components/ConversationList.tsx` - List UI
- `src/sidepanel/hooks/useConversations.ts` - Hook for conversation state

## Acceptance
- Conversations are listed with title and date
- Can create new, load existing, delete
- Messages persist after closing and reopening the side panel
- Auto-title works from first user message
