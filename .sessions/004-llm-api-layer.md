---
Session 004
LLM API Layer
---
# PROMPT

Continuation of session 003 (same prompt). Executing `.plan/003-llm-api-layer.md` — build the unified LLM streaming client for Anthropic, OpenAI, and Gemini.

> Read AGENTS.md, execute plan step .plan/003-llm-api-layer.md.

---
# SESSION

## Actions
- Updated `src/shared/types.ts`: added `JSONSchema`, `LLMProvider`, `LLMConfig`, `ContentPart`, `LLMMessage` (with `toolCallId`/`toolName` for tool results), `ToolDefinition`, `ToolCall`, `StreamEvent`
- Created `src/shared/llms.ts`: unified async-generator `streamLLM()` with three provider implementations:
  - **Anthropic**: SSE via `/v1/messages`; handles `content_block_start/delta/stop` for text, thinking, and tool_use blocks; accumulates partial `input_json_delta` per block index
  - **OpenAI**: SSE via `/v1/chat/completions`; handles streaming text, `reasoning_content` (o-series), and `tool_calls` delta accumulation; emits usage from final chunk via `stream_options`
  - **Gemini**: SSE via `streamGenerateContent?alt=sse`; handles text parts, `thought` parts, and `functionCall` parts; system prompt via `systemInstruction`
- Fixed two TypeScript `Object is possibly 'undefined'` errors from `choices[0]`/`candidates[0]` array access

## Key Decisions
- Single `readLines()` SSE helper shared across all providers (splits on `\n`, strips `data: ` prefix)
- Tool calls yielded individually as `tool_call` events, then `tool_calls_done` — caller drives the agentic loop
- Anthropic thinking requires `temperature=1` (enforced in body builder)
- Gemini tool call IDs synthesised as `name-timestamp` when provider omits them
- AbortSignal: `AbortError` mapped to clean `done` event, not an error
- `contentToString()` helper normalises `ContentPart[]` → plain string for tool result payloads

## State
Phase 3 complete. `src/shared/llms.ts` type-checks cleanly (zero errors in shared/).
Next: Phase 4 — background LLM handler + settings storage.

## Files Modified
- `src/shared/types.ts`
- `src/shared/llms.ts` (new)
