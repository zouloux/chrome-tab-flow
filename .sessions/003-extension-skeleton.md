Prompt: .prompts/003-extension-skeleton.md

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
