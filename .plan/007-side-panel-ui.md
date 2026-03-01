# Phase 7: Side Panel UI

## Goal
Build the main chat interface in the side panel React app.

## Component Tree
```
App
├── Header (logo, settings gear icon, new chat button)
├── ChatView
│   ├── MessageList
│   │   ├── UserMessage (text, attached elements)
│   │   ├── AssistantMessage (markdown, thinking block, tool calls)
│   │   └── ToolCallIndicator (collapsible, shows tool name + result summary)
│   └── ScrollAnchor (auto-scroll to bottom)
├── InputArea
│   ├── ElementPickerButton (target icon)
│   ├── SelectedElements (pills showing picked DOM elements)
│   ├── TextArea (auto-resize, monospace)
│   └── SendButton / StopButton (toggles based on streaming state)
├── ConversationList (bottom drawer/panel, list of past conversations)
└── SettingsPanel (overlay/modal)
```

## Key Behaviors

### TextArea
- Auto-resize height based on content
- Enter = newline
- Cmd+Enter (Mac) / Ctrl+Enter (Win) = send
- Stays editable while AI is streaming (user can prepare next prompt)
- Placeholder: "Ask about this page..."

### Send/Stop Button
- Default: Send icon (arrow up)
- While streaming: Stop icon (square)
- Disabled when textarea is empty AND not streaming
- Clicking Stop sends `prompt:abort` to background

### Message Rendering
- User messages: plain text, right-aligned or full-width with user indicator
- Assistant messages: rendered markdown (code blocks, links, lists, bold/italic)
  - Simple markdown renderer, no dependency. Handle: `**bold**`, `*italic*`, `` `code` ``, code blocks, `# headings`, `- lists`, `[links](url)`
- Thinking/reasoning blocks: collapsible, muted style, italic
- Tool call indicators: small pill showing tool name, expandable to show params + result

### Auto-scroll
- Scroll to bottom on new content while streaming
- Don't force scroll if user has scrolled up (they're reading)
- Resume auto-scroll if user scrolls back to bottom

### Streaming Display
- Text appears token by token
- Thinking appears in a collapsible block
- Tool calls appear as they happen with a spinner, then show result

## Styling
- See `.docs/design.md` for full design spec
- Dark background, monospace font, high contrast
- Minimal borders, rounded corners
- Tailwind utility classes only

## Files to Create
- `src/sidepanel/App.tsx` - Main app with routing (chat vs settings)
- `src/sidepanel/components/Header.tsx`
- `src/sidepanel/components/ChatView.tsx`
- `src/sidepanel/components/MessageList.tsx`
- `src/sidepanel/components/UserMessage.tsx`
- `src/sidepanel/components/AssistantMessage.tsx`
- `src/sidepanel/components/ToolCallIndicator.tsx`
- `src/sidepanel/components/InputArea.tsx`
- `src/sidepanel/components/ConversationList.tsx`
- `src/sidepanel/components/Markdown.tsx` - Simple markdown renderer
- `src/sidepanel/hooks/useChat.ts` - Chat state management
- `src/sidepanel/hooks/useAutoScroll.ts`
- `src/sidepanel/styles.css` - Tailwind imports + base styles

## Acceptance
- Chat messages display correctly with markdown
- Streaming shows tokens appearing in real-time
- Stop button aborts generation
- User can type during streaming
- Auto-scroll works correctly
- Conversation list shows past chats
