# Phase 2: Extension Skeleton

## Goal
Wire up the three extension contexts (background, content, side panel) with message passing. Verify communication works end-to-end.

## Architecture

```
Side Panel (React) <--chrome.runtime.sendMessage--> Background (Service Worker)
                                                          |
                                              chrome.tabs.sendMessage
                                                          |
                                                    Content Script
```

### Message Protocol
All messages follow a typed envelope:
```ts
interface Message<T = unknown> {
  type: string       // e.g. "dom:getContent", "llm:stream", "settings:get"
  payload: T
  requestId?: string // for request/response pairing
}

interface Response<T = unknown> {
  success: boolean
  data?: T
  error?: string
  requestId?: string
}
```

## Steps

### 2.1 Shared Message Types (`src/shared/messages.ts`)
- Define all message type constants as a union type
- Type-safe message creators for each message type
- Generic `sendToBackground()`, `sendToContent()`, `sendToSidePanel()` helpers

### 2.2 Background Service Worker (`src/background/index.ts`)
- Register side panel on extension icon click: `chrome.sidePanel.open()`
- Listen for messages from side panel and content scripts
- Route messages between contexts
- Skeleton message handler (switch on `type`)

### 2.3 Content Script (`src/content/index.ts`)
- Listen for messages from background
- Skeleton handler that responds to a `ping` message
- Injected on all pages via manifest

### 2.4 Side Panel (`src/sidepanel/`)
- Minimal React app rendering "TabFlow" text
- On mount, send a `ping` through background to content script
- Display connection status

## Files to Create/Modify
- `src/shared/messages.ts` - Message protocol
- `src/background/index.ts` - Service worker setup
- `src/content/index.ts` - Content script setup
- `src/sidepanel/App.tsx` - Basic React shell

## Acceptance
- Side panel opens and shows "TabFlow"
- Ping travels: Side Panel -> Background -> Content -> Background -> Side Panel
- Console logs confirm round-trip message passing
