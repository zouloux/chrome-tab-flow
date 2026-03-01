# TabFlow - Technical Stack

## Runtime
- **Chrome Extension** Manifest V3
- **Chrome Side Panel API** for the UI panel

## Language & Build
- **TypeScript** (strict mode, no `any`)
- **Bun** for package management and build/bundling
- **React 19** for side panel UI
- **Tailwind CSS v4** for styling

## Dependencies (exhaustive)
### Runtime
- `react` + `react-dom` - UI rendering

### Dev
- `@types/react` + `@types/react-dom` - React types
- `@types/chrome` - Chrome extension API types
- `typescript` - Type checking
- `tailwindcss` - CSS utility framework

**No other dependencies.** Everything else is hand-written:
- LLM API client (raw `fetch()`)
- SSE/stream parser
- Markdown renderer
- HTML-to-text converter
- UUID generation (`crypto.randomUUID()`)

## Build Pipeline (`build.ts`)
Bun's built-in bundler handles everything:
- **3 entry points**: background, sidepanel, content
- **Output**: `dist/` directory, ready to load as unpacked extension
- **CSS**: Tailwind processed via Bun plugin or CLI
- **Watch mode**: `bun run dev` for live rebuilding
- **No webpack, no vite, no esbuild** - Bun does it all

## Extension Architecture

### Contexts
| Context | Entry | Runs In | Can Do |
|---------|-------|---------|--------|
| Background | `background/index.ts` | Service Worker | LLM API calls, chrome.* APIs, orchestration |
| Side Panel | `sidepanel/index.tsx` | Isolated page | React UI, user interaction |
| Content | `content/index.ts` | Page context | DOM access, page manipulation |

### Communication
All contexts communicate via `chrome.runtime` message passing:
- **Side Panel -> Background**: `chrome.runtime.sendMessage()`
- **Background -> Content**: `chrome.tabs.sendMessage(tabId, ...)`
- **Content -> Background**: `chrome.runtime.sendMessage()`
- **Background -> Side Panel**: `chrome.runtime.sendMessage()` (side panel listens)

For streaming, background sends multiple messages to side panel (one per chunk).

### Storage
- `chrome.storage.local` for all persistent data
- Settings, API keys, conversation history
- ~10MB limit, sufficient for text conversations

## LLM Integration (`src/shared/llms.ts`)

### Supported Providers
| Provider | API | Auth | Streaming |
|----------|-----|------|-----------|
| Anthropic | `/v1/messages` | `x-api-key` header | SSE |
| OpenAI | `/v1/chat/completions` | `Bearer` token | SSE |
| Gemini | `/v1beta/models/{m}:streamGenerateContent` | `x-goog-api-key` | NDJSON |

### Unified Interface
Single `streamLLM()` async generator function that:
1. Accepts provider-agnostic config + messages + tools
2. Builds provider-specific request
3. Streams response, yields normalized events
4. Handles tool calling for all providers
5. Supports `AbortSignal` for cancellation

### Tool Calling
- Tools defined as JSON Schema (compatible with all 3 providers)
- Execution happens in content script or background
- Results formatted per-provider and fed back into conversation

## File Structure
```
chrome-ai/
├── src/
│   ├── background/
│   │   ├── index.ts          # Service worker entry
│   │   ├── orchestrator.ts   # LLM conversation loop
│   │   ├── conversations.ts  # Conversation CRUD
│   │   ├── screenshot.ts     # Screenshot capture + crop
│   │   ├── state.ts          # In-memory state
│   │   └── storage.ts        # chrome.storage helpers
│   ├── sidepanel/
│   │   ├── index.tsx          # React mount
│   │   ├── App.tsx            # Root component
│   │   ├── styles.css         # Tailwind imports
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── ChatView.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── UserMessage.tsx
│   │   │   ├── AssistantMessage.tsx
│   │   │   ├── ToolCallIndicator.tsx
│   │   │   ├── InputArea.tsx
│   │   │   ├── ElementPickerButton.tsx
│   │   │   ├── SelectedElements.tsx
│   │   │   ├── ConversationList.tsx
│   │   │   ├── SettingsPanel.tsx
│   │   │   ├── Markdown.tsx
│   │   │   ├── Toggle.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── EmptyState.tsx
│   │   └── hooks/
│   │       ├── useChat.ts
│   │       ├── useSettings.ts
│   │       ├── useConversations.ts
│   │       └── useAutoScroll.ts
│   ├── content/
│   │   ├── index.ts           # Message router
│   │   ├── picker.ts          # DOM element picker
│   │   └── tools/
│   │       ├── page-reader.ts
│   │       ├── page-actions.ts
│   │       ├── dom-manipulator.ts
│   │       ├── screenshot.ts
│   │       └── youtube.ts
│   └── shared/
│       ├── types.ts           # All type definitions
│       ├── constants.ts       # Extension constants
│       ├── messages.ts        # Message protocol
│       ├── llms.ts            # Unified LLM client
│       ├── tools.ts           # Tool registry + schemas
│       ├── settings.ts        # Settings types + defaults
│       └── system-prompt.ts   # System prompt builder
├── public/
│   ├── manifest.json
│   ├── sidepanel.html
│   └── icons/
├── build.ts
├── package.json
├── tsconfig.json
└── tailwind.config.js
```
