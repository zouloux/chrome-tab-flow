# Phase 14: Polish & Error Handling

## Goal
Handle edge cases, improve UX, add error handling, final quality pass.

## Error Handling

### LLM Errors
- Invalid API key: show clear error in chat with link to settings
- Rate limiting: show "Rate limited, try again in X seconds"
- Network error: show retry button
- Model unavailable: suggest alternative model
- Token limit exceeded: auto-truncate conversation history (keep system prompt + last N messages)

### Content Script Errors
- Element not found: return friendly error to LLM ("Element matching selector X not found")
- Page navigation during tool execution: detect and abort gracefully
- Content script not injected (chrome:// pages, extension pages): show warning in side panel

### Extension Errors
- Service worker killed: reconnect on next interaction, reload state from storage
- Storage quota exceeded: warn user, suggest deleting old conversations
- Permission denied: guide user to grant permissions

## UX Refinements

### Loading States
- Skeleton pulse animation while waiting for first token
- Tool execution shows spinner with tool name
- Conversation list shows loading state

### Empty States
- No conversations: "Start a new chat to begin"
- No API key configured: "Configure your API key in settings to get started"
- Unsupported page (chrome://): "TabFlow can't access this page"

### Keyboard Shortcuts
- Cmd+Enter: Send message
- Cmd+Shift+N: New conversation
- Escape: Close settings / cancel element picker

### Responsive Side Panel
- Side panel width varies (300px-600px)
- All layouts must adapt gracefully
- Text wrapping, truncation where needed

## Performance
- Debounce settings saves (500ms)
- Throttle stream forwarding if too many chunks per second
- Lazy load conversation messages (don't load all at once)
- Content cleanup: remove HTML comments, script tags, style tags before sending to LLM

## Security
- API keys stored in chrome.storage.local (per-extension sandboxed)
- Content script runs in page context - be careful with eval/innerHTML
- Sanitize any HTML rendered in the side panel (prevent XSS from page content)
- Tool execution validates selectors before use

## Files to Modify
- All existing files - add error handling
- `src/sidepanel/components/ErrorBoundary.tsx` - React error boundary
- `src/sidepanel/components/EmptyState.tsx` - Empty state components

## Acceptance
- No unhandled errors in any scenario
- Graceful degradation when things go wrong
- Clear user feedback for all error states
- Smooth, polished interactions
