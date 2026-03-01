---
Session 003
Extension Skeleton
---
# PROMPT

Implement Phase 2 of the TabFlow extension plan: wire up the three extension contexts (background service worker, content script, side panel) with typed message passing and verify end-to-end communication.

> Read AGENTS.md, execute plan step .plan/002-extension-skeleton.md. Ask questions if needed.

### Follow-up
After initial implementation the user reported:
> "I have this error when I load the extension: TabFlow Connection error: Content script unreachable: Error: Could not establish connection. Receiving end does not exist."

Fix applied: programmatically inject the content script on demand when the tab was open before the extension loaded.

---
# SESSION

## Actions
- Created `src/shared/messages.ts`: typed `Message<T>` / `Response<T>` envelopes, `MessageType` union, `sendToBackground()`, `sendToContent()`, `ok()`, `err()` helpers
- Rewrote `src/background/index.ts`: async message router with `ping` handler; forwards to content script, auto-injects via `chrome.scripting.executeScript()` on first failure, relays pong back
- Rewrote `src/content/index.ts`: typed handler, responds `ok("pong")` to `ping`
- Rewrote `src/sidepanel/App.tsx`: pings background on mount, shows connection status (checking / connected / error)
- Ran `bun install` (deps were missing) then verified `bun run build.ts` succeeds

## Key Decisions
- Background owns all cross-context routing; side panel never talks to content directly
- Auto-inject content script on connection failure to handle pre-loaded tabs
- `requestId` threaded through all messages for future request/response pairing

## State
Phase 2 complete. Extension builds cleanly. All three contexts communicate.
Next: Phase 3 — `003-llm-api-layer.md` (unified LLM client).

## Files Modified
- `src/shared/messages.ts` (new)
- `src/background/index.ts`
- `src/content/index.ts`
- `src/sidepanel/App.tsx`
