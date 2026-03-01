# Prompt: Fix LLM Unit Test Failures

## Session goal
Fix 7 failing tests in `tests/llms.test.ts` after running `bun test`. The test suite covers the unified LLM streaming layer (`src/shared/llms.ts`) for Anthropic, OpenAI, and Gemini.

## User prompt
> Il y a des erreurs dans le test unitaire, corriges les en faisant un plan logique séparé en taches distinctes que je peux ridistribuer a d'autres agents

Then: run the two standard actions (save-to-session + commit-and-merge).

## Q&A
- Q: Can OpenCode distribute tasks to sub-agents directly?
- A: Yes, via the `task` tool — multiple calls in one message run in parallel.

## Failing tests at session start
1. anthropic > parses tool calls — `tool_calls_done` never emitted
2. anthropic > handles tool result — final text empty
3. openai > handles tool result — final text empty
4. gemini > streams a simple text reply — text empty, no done event
5. gemini > returns usage in done event — done undefined
6. gemini > respects system prompt — text empty
7. gemini > parses tool calls — 0 tool calls
