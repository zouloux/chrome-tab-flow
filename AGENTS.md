# TabFlow - Chrome AI Extension

## Project
Chrome extension (Manifest V3) that adds an AI-powered side panel to control and analyze browser tabs. Uses Chrome Side Panel API.

## Tech
React + Tailwind + TypeScript, bundled with Bun. Zero extra npm dependencies. Unified LLM layer for Anthropic/OpenAI/Gemini with streaming + tool calling.

## Structure
```
src/
  background/    # Service worker - LLM calls, message hub, state
  sidepanel/     # React app - chat UI, settings, history
  content/       # Content scripts - DOM ops, element picker, screenshots
  shared/        # Types, constants, llms.ts, tools schema
```

## Key Docs
- `.docs/prd.md` - Product requirements
- `.docs/design.md` - UI/UX design specs
- `.docs/tech-stack.md` - Technical stack details

## Working Directories
- `.plan/` - Implementation plan (numbered markdown files). Read `000-overview.md` first.
- `.sessions/` - Session files combining the original prompt and a compact summary. Read `000-overview.md` first.
- `.memory/` - Persistent discoveries & lessons learned. Read `000-overview.md` first.
- `.actions/` - Reusable AI agent action scripts. Read `000-overview.md` first.

## Conventions
- All plan/session/memory files follow `NNN-title.md` naming
- Code: TypeScript strict, no `any`, functional React components
- Styling: Tailwind only, dark mode, monospace typography
- LLM calls happen ONLY in background service worker (CORS)
- Content script <-> Background <-> Side Panel via `chrome.runtime` messaging
