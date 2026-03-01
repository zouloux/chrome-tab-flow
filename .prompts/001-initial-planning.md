# Session 001 - Initial Planning

## Context
First session. User wants to build a Chrome AI extension called TabFlow.

## Full Prompt (translated from French)

Build a Chrome AI extension:

### Goals
- Control the current tab (AI can perform actions on the page)
- Summarize pages
- YouTube summaries if possible

### Settings Panel
- Simple, dark mode, monospace typography
- API keys for Anthropic / OpenAI / Gemini
- Default models and reasoning toggle

### Usage
- Side panel opens on the right when extension is activated
- Past conversations listed (title / date) at the bottom
- New conversation by default, text input, Enter for newline, Cmd+Enter to send
- DOM element picker (target icon next to input) to select elements
- Send button becomes Stop while AI is running
- Show reasoning if possible (setting toggle)
- Can type next prompt while AI is working; send when AI finishes
- Minimalist dark UI, rounded borders, simple borders, high-ish contrast, monospace, spacious and clear

### Architecture
- Each conversation has a system prompt explaining tools and capabilities
- Extension has an MCP-like tool system (not a running server, just callable tools)
- LLM can: read page content, control elements (click, fill, modify DOM), scroll, take partial screenshots, change URL
- Other useful actions to be defined by the implementer

### Decisions Made (Q&A)
- **Side Panel**: Chrome Side Panel API (Manifest V3, native)
- **Dependencies**: React, Tailwind, Bun are fine. No additional npm runtime deps.
- **YouTube**: Both transcript extraction + page context
- **Streaming**: Yes, token-by-token streaming
- **Name**: TabFlow

### Tech Stack
- React + Tailwind + TypeScript
- Bun for build
- Zero extra npm dependencies
- Single `llms.ts` file compatible with Anthropic, OpenAI, Gemini
- Tool calling system managed internally

### Deliverable
- Full implementation plan (no code)
- AGENTS.md, .plan/, .prompts/, .sessions/, .memory/ directories
- .docs/prd.md, .docs/design.md, .docs/tech-stack.md
