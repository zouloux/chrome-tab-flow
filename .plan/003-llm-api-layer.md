# Phase 3: LLM API Layer

## Goal
Build `src/shared/llms.ts` - a unified streaming LLM client supporting Anthropic, OpenAI, and Gemini. Zero external deps, raw `fetch()` only.

## Design

### Provider Interface
```ts
type LLMProvider = 'anthropic' | 'openai' | 'gemini'

interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  model: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentPart[]
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }

interface ToolDefinition {
  name: string
  description: string
  parameters: JSONSchema  // JSON Schema object
}

interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

interface StreamEvent {
  type: 'text' | 'thinking' | 'tool_call' | 'tool_calls_done' | 'done' | 'error'
  content?: string        // for text/thinking
  toolCall?: ToolCall     // for tool_call
  usage?: { input: number; output: number }
}
```

### Streaming Implementation
Each provider uses SSE or NDJSON:

**Anthropic** (`/v1/messages`):
- Header: `x-api-key`, `anthropic-version: 2023-06-01`
- Stream events: `message_start`, `content_block_start`, `content_block_delta`, `message_stop`
- Thinking blocks: `type: "thinking"` content blocks (when extended thinking enabled)
- Tool use: `type: "tool_use"` content blocks

**OpenAI** (`/v1/chat/completions`):
- Header: `Authorization: Bearer {key}`
- Stream: `data: {...}` SSE lines
- Tool calls: `tool_calls` array in delta
- Reasoning: `reasoning_content` field (o-series models)

**Gemini** (`/v1beta/models/{model}:streamGenerateContent`):
- Header: `x-goog-api-key`
- Stream: NDJSON array chunks
- Tool calls: `functionCall` parts
- Thinking: `thought` field (when thinking enabled)

### Core Function
```ts
async function* streamLLM(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[],
  options?: { signal?: AbortSignal; thinking?: boolean }
): AsyncGenerator<StreamEvent>
```

Single async generator that:
1. Builds provider-specific request body
2. Calls `fetch()` with streaming
3. Parses SSE/NDJSON chunks
4. Yields normalized `StreamEvent` objects
5. Supports `AbortSignal` for cancellation (stop button)

### Tool Call Flow
When the LLM returns tool calls:
1. Generator yields `tool_call` events
2. Generator yields `tool_calls_done`
3. Caller executes tools, gets results
4. Caller appends tool results to messages
5. Caller calls `streamLLM()` again (loop until no more tool calls)

## Files to Create
- `src/shared/llms.ts` - Unified LLM client
- `src/shared/types.ts` - All type definitions above

## Key Decisions
- No SDK deps. Raw fetch + manual SSE parsing.
- SSE parser: read `response.body` as `ReadableStream`, split on `\n\n`, parse `data:` lines
- Tool result format normalized across providers
- Abort controller passed through for stop functionality

## Acceptance
- Can stream a simple prompt to all 3 providers
- Tool calls are correctly parsed and returned
- Thinking/reasoning content is captured when enabled
- AbortSignal cancels the stream cleanly
