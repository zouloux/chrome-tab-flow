Prompt: .prompts/005-llm-tests-fix.md

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
