# Implementation Plan Overview

Numbered files in this directory describe each implementation phase in order. Each file is self-contained with goals, files to create, key decisions, and acceptance criteria.

## Phases
1. `001-project-setup.md` - Bun project, deps, build config, manifest
2. `002-extension-skeleton.md` - Background worker, content script, side panel shell
3. `003-llm-api-layer.md` - Unified LLM client (Anthropic/OpenAI/Gemini)
4. `004-tool-system.md` - Tool definitions, execution pipeline, schema
5. `005-background-service-worker.md` - Message hub, LLM orchestration, state
6. `006-content-scripts.md` - DOM reader, manipulator, element picker, screenshot
7. `007-side-panel-ui.md` - Chat interface, message rendering, markdown
8. `008-settings-panel.md` - API keys, model config, reasoning toggle
9. `009-conversation-management.md` - History, storage, new/resume conversations
10. `010-dom-element-picker.md` - Visual element selector, highlight, attach to prompt
11. `011-youtube-integration.md` - Transcript extraction + page context
12. `012-screenshot-system.md` - Partial screenshots, element capture, send to LLM
13. `013-system-prompt.md` - Pre-prompt design, tool descriptions, behavior rules
14. `014-polish.md` - Error handling, edge cases, UX refinements
15. `015-api-key-encryption.md` - Web Crypto API encryption for API keys at rest

## Reading Order
Read files in numerical order. Each phase builds on previous ones.
