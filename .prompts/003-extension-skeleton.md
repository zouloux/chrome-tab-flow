# Prompt: Extension Skeleton

## Session Goal
Implement Phase 2 of the TabFlow extension plan: wire up the three extension contexts (background service worker, content script, side panel) with typed message passing and verify end-to-end communication.

## User Prompt
> Read AGENTS.md, execute plan step .plan/002-extension-skeleton.md. Ask questions if needed.

## Follow-up
After initial implementation the user reported:
> "I have this error when I load the extension: TabFlow Connection error: Content script unreachable: Error: Could not establish connection. Receiving end does not exist."

Fix applied: programmatically inject the content script on demand when the tab was open before the extension loaded.
