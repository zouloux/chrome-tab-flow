# Phase 5: Background Service Worker

## Goal
Build the central orchestrator that manages LLM conversations, routes messages, and executes tool loops.

## Responsibilities

### 1. Message Hub
- Listen for messages from side panel (prompts, settings changes, conversation actions)
- Listen for messages from content scripts (tool execution results)
- Route appropriately

### 2. LLM Orchestration
The core loop when a user sends a prompt:

```
1. Receive prompt from side panel
2. Load conversation history from storage
3. Append user message
4. Call streamLLM() with messages + tools
5. For each StreamEvent:
   - text/thinking: forward to side panel for live display
   - tool_call: queue for execution
   - tool_calls_done: execute all queued tools via content script
   - done: finalize, save to storage
6. If tools were called, append results and goto step 4
7. Send completion signal to side panel
```

### 3. State Management
In-memory state (lives as long as service worker is alive):
```ts
interface BackgroundState {
  activeConversations: Map<string, ConversationState>
  abortControllers: Map<string, AbortController>  // for stop button
}

interface ConversationState {
  id: string
  tabId: number
  messages: LLMMessage[]
  isStreaming: boolean
}
```

Persisted state (`chrome.storage.local`):
- Settings (API keys, models, preferences)
- Conversation history (all past conversations)

### 4. Abort/Stop
- When user hits Stop, side panel sends `llm:abort` message
- Background calls `abortController.abort()` on the active stream
- Stream generator catches abort and yields final event
- Side panel re-enables the send button

## Message Types (Background handles)

| From | Type | Action |
|------|------|--------|
| Side Panel | `prompt:send` | Start LLM stream |
| Side Panel | `prompt:abort` | Abort active stream |
| Side Panel | `conversation:new` | Create new conversation |
| Side Panel | `conversation:list` | Return all conversations |
| Side Panel | `conversation:load` | Load a specific conversation |
| Side Panel | `conversation:delete` | Delete a conversation |
| Side Panel | `settings:get` | Return current settings |
| Side Panel | `settings:set` | Update settings |
| Content | `tool:result` | Tool execution result |

## Files to Create/Modify
- `src/background/index.ts` - Main service worker entry
- `src/background/orchestrator.ts` - LLM conversation loop
- `src/background/state.ts` - State management
- `src/background/storage.ts` - chrome.storage helpers

## Key Decisions
- Service workers can be killed by Chrome after ~5 min of inactivity. Use `chrome.storage.local` for anything that must persist.
- Stream forwarding to side panel uses `chrome.runtime.sendMessage()` for each chunk
- Tool execution timeout: 10 seconds per tool call, configurable

## Acceptance
- Full prompt -> stream -> display loop works
- Tool calls execute through content script and results feed back to LLM
- Stop button aborts the stream immediately
- Conversations persist across service worker restarts
