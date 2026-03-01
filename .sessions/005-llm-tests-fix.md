---
Session 005
LLM Tests Fix
---
# PROMPT

Fix 7 failing tests in `tests/llms.test.ts` after running `bun test`. The test suite covers the unified LLM streaming layer (`src/shared/llms.ts`) for Anthropic, OpenAI, and Gemini.

> Il y a des erreurs dans le test unitaire, corriges les en faisant un plan logique séparé en taches distinctes que je peux ridistribuer a d'autres agents

Then: run the two standard actions (save-to-session + commit-and-merge).

### Q&A
- Q: Can OpenCode distribute tasks to sub-agents directly?
- A: Yes, via the `task` tool — multiple calls in one message run in parallel.

### Failing tests at session start
1. anthropic > parses tool calls — `tool_calls_done` never emitted
2. anthropic > handles tool result — final text empty
3. openai > handles tool result — final text empty
4. gemini > streams a simple text reply — text empty, no done event
5. gemini > returns usage in done event — done undefined
6. gemini > respects system prompt — text empty
7. gemini > parses tool calls — 0 tool calls

---
# SESSION

## Actions
- Analysed 7 failing tests across Anthropic, OpenAI, Gemini providers
- Produced a 6-task plan and distributed tasks 1, 2, 6 to parallel sub-agents via `task` tool
- Sub-agents applied all fixes; tasks 3, 4, 5 were handled by the Gemini diagnostic agent

## Key Decisions
- Added `hadToolCalls` flag to `streamAnthropic` (was hardcoded `false`)
- Added `toolCalls?: ToolCall[]` to `LLMMessage` for assistant role
- Updated `buildAnthropicBody` and `buildOpenAIBody` to emit proper tool_use / tool_calls blocks
- Fixed test second-turn construction to include `toolCalls` in assistant message
- Changed Gemini model `gemini-2.0-flash` → `gemini-2.5-flash` (404 on new accounts)
- Added `done` yield after Gemini HTTP error path; added `outputTokenCount` fallback

## Files Modified
- `src/shared/llms.ts` — streamAnthropic bug fix, Gemini fixes, builders updated
- `src/shared/types.ts` — added `toolCalls?: ToolCall[]` to `LLMMessage`
- `tests/llms.test.ts` — model name + second-turn message construction

## State
18/18 tests pass. LLM layer fully tested for text, usage, system prompt, tool calls, tool round-trip, and AbortSignal across all 3 providers.
