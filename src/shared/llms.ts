/**
 * Unified streaming LLM client for Anthropic, OpenAI, and Gemini.
 * Zero external dependencies — raw fetch() + manual SSE/NDJSON parsing.
 */

import type {
  LLMConfig,
  LLMMessage,
  ToolDefinition,
  ToolCall,
  StreamEvent,
  ContentPart,
} from "./types"

// ── SSE helpers ───────────────────────────────────────────────────────────────

/** Read an SSE/NDJSON stream line by line, yielding non-empty lines. */
async function* readLines(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      if (signal?.aborted) break
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        if (line.trim()) yield line
      }
    }
    if (buffer.trim()) yield buffer
  } finally {
    reader.releaseLock()
  }
}

// ── Content normalisation helpers ─────────────────────────────────────────────

function contentToString(content: string | ContentPart[]): string {
  if (typeof content === "string") return content
  return content
    .filter((p): p is Extract<ContentPart, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("")
}

// ── Anthropic ─────────────────────────────────────────────────────────────────

function buildAnthropicBody(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[],
  thinking?: boolean
): Record<string, unknown> {
  // Anthropic: system prompt is top-level, not inside messages[]
  const userMessages = messages.filter((m) => m.role !== "system")

  const anthropicMessages = userMessages.map((m): Record<string, unknown> => {
    if (m.role === "tool") {
      return {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: m.toolCallId,
            content: typeof m.content === "string" ? m.content : contentToString(m.content),
          },
        ],
      }
    }

    // Assistant message with tool calls: emit tool_use blocks so Anthropic can
    // match them with subsequent tool_result blocks.
    if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
      const parts: Record<string, unknown>[] = []
      const textContent = typeof m.content === "string" ? m.content : contentToString(m.content)
      if (textContent) parts.push({ type: "text", text: textContent })
      for (const tc of m.toolCalls) {
        parts.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.arguments })
      }
      return { role: "assistant", content: parts }
    }

    if (typeof m.content === "string") {
      return { role: m.role, content: m.content }
    }

    // ContentPart[]
    const parts = m.content.map((p) => {
      if (p.type === "text") return { type: "text", text: p.text }
      if (p.type === "image") {
        return {
          type: "image",
          source: { type: "base64", media_type: p.mimeType, data: p.data },
        }
      }
      return p
    })
    return { role: m.role, content: parts }
  })

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: config.maxTokens ?? 4096,
    stream: true,
    messages: anthropicMessages,
  }

  if (config.systemPrompt) body.system = config.systemPrompt
  if (config.temperature !== undefined) body.temperature = config.temperature

  if (tools && tools.length > 0) {
    body.tools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }))
  }

  if (thinking) {
    body.thinking = { type: "enabled", budget_tokens: 8000 }
    // Anthropic requires temperature=1 when thinking is enabled
    body.temperature = 1
  }

  return body
}

async function* streamAnthropic(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[],
  signal?: AbortSignal,
  thinking?: boolean
): AsyncGenerator<StreamEvent> {
  const body = buildAnthropicBody(config, messages, tools, thinking)

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => res.statusText)
    yield { type: "error", error: `Anthropic ${res.status}: ${text}` }
    return
  }

  // Accumulate partial tool input JSON per block index
  const toolInputBuffers: Record<number, string> = {}
  const toolMeta: Record<number, { id: string; name: string }> = {}
  let inputTokens = 0
  let outputTokens = 0
  let hadToolCalls = false

  for await (const line of readLines(res.body, signal)) {
    if (!line.startsWith("data: ")) continue
    const raw = line.slice(6).trim()
    if (raw === "[DONE]" || !raw) continue

    let evt: Record<string, unknown>
    try {
      evt = JSON.parse(raw) as Record<string, unknown>
    } catch {
      continue
    }

    const type = evt.type as string

    if (type === "message_start") {
      const usage = (evt.message as Record<string, unknown>)?.usage as
        | Record<string, number>
        | undefined
      if (usage) inputTokens = usage.input_tokens ?? 0
    }

    if (type === "message_delta") {
      const usage = evt.usage as Record<string, number> | undefined
      if (usage) outputTokens = usage.output_tokens ?? 0
    }

    if (type === "content_block_start") {
      const idx = evt.index as number
      const block = evt.content_block as Record<string, unknown>
      if (block.type === "tool_use") {
        toolMeta[idx] = { id: block.id as string, name: block.name as string }
        toolInputBuffers[idx] = ""
      }
    }

    if (type === "content_block_delta") {
      const idx = evt.index as number
      const delta = evt.delta as Record<string, unknown>

      if (delta.type === "text_delta") {
        yield { type: "text", content: delta.text as string }
      } else if (delta.type === "thinking_delta") {
        yield { type: "thinking", content: delta.thinking as string }
      } else if (delta.type === "input_json_delta") {
        toolInputBuffers[idx] = (toolInputBuffers[idx] ?? "") + (delta.partial_json as string)
      }
    }

    if (type === "content_block_stop") {
      const idx = evt.index as number
      if (toolMeta[idx] && toolInputBuffers[idx] !== undefined) {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(toolInputBuffers[idx]) as Record<string, unknown>
        } catch {
          /* empty input is valid */
        }
        const tc: ToolCall = { id: toolMeta[idx].id, name: toolMeta[idx].name, arguments: args }
        yield { type: "tool_call", toolCall: tc }
        hadToolCalls = true
        delete toolMeta[idx]
        delete toolInputBuffers[idx]
      }
    }

    if (type === "message_stop") {
      if (Object.keys(toolMeta).length === 0 && Object.keys(toolInputBuffers).length === 0) {
        // No pending tool calls — check if stop_reason was tool_use (edge case)
      }
    }
  }

  // If there were tool calls, signal caller
  if (!hadToolCalls) {
    yield { type: "done", usage: { input: inputTokens, output: outputTokens } }
  } else {
    yield { type: "tool_calls_done" }
  }
}

// ── OpenAI ────────────────────────────────────────────────────────────────────

function buildOpenAIBody(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[]
): Record<string, unknown> {
  const oaiMessages = messages.map((m): Record<string, unknown> => {
    if (m.role === "tool") {
      return {
        role: "tool",
        tool_call_id: m.toolCallId,
        content: typeof m.content === "string" ? m.content : contentToString(m.content),
      }
    }

    // Assistant message with tool calls: emit OpenAI tool_calls array so the
    // API can match subsequent tool messages.
    if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
      const textContent = typeof m.content === "string" ? m.content : contentToString(m.content)
      return {
        role: "assistant",
        content: textContent || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      }
    }

    if (typeof m.content === "string") {
      return { role: m.role, content: m.content }
    }

    const parts = m.content.map((p) => {
      if (p.type === "text") return { type: "text", text: p.text }
      if (p.type === "image") {
        return {
          type: "image_url",
          image_url: { url: `data:${p.mimeType};base64,${p.data}` },
        }
      }
      return p
    })
    return { role: m.role, content: parts }
  })

  // Inject system prompt
  if (config.systemPrompt) {
    oaiMessages.unshift({ role: "system", content: config.systemPrompt })
  }

  const body: Record<string, unknown> = {
    model: config.model,
    stream: true,
    stream_options: { include_usage: true },
    messages: oaiMessages,
  }

  if (config.maxTokens !== undefined) body.max_completion_tokens = config.maxTokens
  if (config.temperature !== undefined) body.temperature = config.temperature

  if (tools && tools.length > 0) {
    body.tools = tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }))
  }

  return body
}

async function* streamOpenAI(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[],
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const body = buildOpenAIBody(config, messages, tools)

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => res.statusText)
    yield { type: "error", error: `OpenAI ${res.status}: ${text}` }
    return
  }

  // Tool call accumulation: index -> {id, name, argsBuffer}
  const toolBuffers: Record<
    number,
    { id: string; name: string; args: string }
  > = {}
  let hadToolCalls = false
  let inputTokens = 0
  let outputTokens = 0

  for await (const line of readLines(res.body, signal)) {
    if (!line.startsWith("data: ")) continue
    const raw = line.slice(6).trim()
    if (raw === "[DONE]") break
    if (!raw) continue

    let chunk: Record<string, unknown>
    try {
      chunk = JSON.parse(raw) as Record<string, unknown>
    } catch {
      continue
    }

    // Usage (sent in the final chunk with stream_options)
    const usage = chunk.usage as Record<string, number> | undefined
    if (usage) {
      inputTokens = usage.prompt_tokens ?? 0
      outputTokens = usage.completion_tokens ?? 0
    }

    const choices = chunk.choices as Array<Record<string, unknown>> | undefined
    if (!choices || choices.length === 0) continue

    const firstChoice = choices[0] as Record<string, unknown> | undefined
    const delta = firstChoice?.delta as Record<string, unknown> | undefined
    if (!delta) continue

    // Reasoning (o-series)
    const reasoning = delta.reasoning_content as string | undefined
    if (reasoning) yield { type: "thinking", content: reasoning }

    // Text content
    const content = delta.content as string | undefined
    if (content) yield { type: "text", content }

    // Tool calls
    const tcDeltas = delta.tool_calls as Array<Record<string, unknown>> | undefined
    if (tcDeltas) {
      for (const tcd of tcDeltas) {
        const idx = tcd.index as number
        const fn = tcd.function as Record<string, string> | undefined

        if (tcd.id) {
          toolBuffers[idx] = { id: tcd.id as string, name: fn?.name ?? "", args: "" }
        }

        if (!toolBuffers[idx]) toolBuffers[idx] = { id: "", name: fn?.name ?? "", args: "" }

        if (fn?.name && !toolBuffers[idx].name) toolBuffers[idx].name = fn.name
        if (fn?.arguments) toolBuffers[idx].args += fn.arguments
      }
      hadToolCalls = true
    }
  }

  // Emit completed tool calls
  if (hadToolCalls) {
    for (const buf of Object.values(toolBuffers)) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(buf.args) as Record<string, unknown>
      } catch {
        /* partial args — emit empty */
      }
      yield { type: "tool_call", toolCall: { id: buf.id, name: buf.name, arguments: args } }
    }
    yield { type: "tool_calls_done" }
  } else {
    yield { type: "done", usage: { input: inputTokens, output: outputTokens } }
  }
}

// ── OpenRouter ────────────────────────────────────────────────────────────────

async function* streamOpenRouter(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[],
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  // OpenRouter uses OpenAI-compatible API, so reuse the same body builder
  const body = buildOpenAIBody(config, messages, tools)

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => res.statusText)
    yield { type: "error", error: `OpenRouter ${res.status}: ${text}` }
    return
  }

  // OpenRouter streams in same format as OpenAI, reuse parsing logic
  const toolBuffers: Record<
    number,
    { id: string; name: string; args: string }
  > = {}
  let hadToolCalls = false
  let inputTokens = 0
  let outputTokens = 0

  for await (const line of readLines(res.body, signal)) {
    if (!line.startsWith("data: ")) continue
    const raw = line.slice(6).trim()
    if (raw === "[DONE]") break
    if (!raw) continue

    let chunk: Record<string, unknown>
    try {
      chunk = JSON.parse(raw) as Record<string, unknown>
    } catch {
      continue
    }

    // Usage
    const usage = chunk.usage as Record<string, number> | undefined
    if (usage) {
      inputTokens = usage.prompt_tokens ?? 0
      outputTokens = usage.completion_tokens ?? 0
    }

    const choices = chunk.choices as Array<Record<string, unknown>> | undefined
    if (!choices || choices.length === 0) continue

    const firstChoice = choices[0] as Record<string, unknown> | undefined
    const delta = firstChoice?.delta as Record<string, unknown> | undefined
    if (!delta) continue

    // Text content
    const content = delta.content as string | undefined
    if (content) yield { type: "text", content }

    // Tool calls
    const tcDeltas = delta.tool_calls as Array<Record<string, unknown>> | undefined
    if (tcDeltas) {
      for (const tcd of tcDeltas) {
        const idx = tcd.index as number
        const fn = tcd.function as Record<string, string> | undefined

        if (tcd.id) {
          toolBuffers[idx] = { id: tcd.id as string, name: fn?.name ?? "", args: "" }
        }

        if (!toolBuffers[idx]) toolBuffers[idx] = { id: "", name: fn?.name ?? "", args: "" }

        if (fn?.name && !toolBuffers[idx].name) toolBuffers[idx].name = fn.name
        if (fn?.arguments) toolBuffers[idx].args += fn.arguments
      }
      hadToolCalls = true
    }
  }

  // Emit completed tool calls
  if (hadToolCalls) {
    for (const buf of Object.values(toolBuffers)) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(buf.args) as Record<string, unknown>
      } catch {
        /* partial args — emit empty */
      }
      yield { type: "tool_call", toolCall: { id: buf.id, name: buf.name, arguments: args } }
    }
    yield { type: "tool_calls_done" }
  } else {
    yield { type: "done", usage: { input: inputTokens, output: outputTokens } }
  }
}

// ── Gemini ────────────────────────────────────────────────────────────────────

function buildGeminiBody(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[],
  thinking?: boolean
): Record<string, unknown> {
  const contents: Array<Record<string, unknown>> = []

  for (const m of messages) {
    if (m.role === "system") continue // handled via systemInstruction

    if (m.role === "tool") {
      // Gemini tool result comes as a "function response" part from the user side
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: m.toolName ?? "tool",
              response: {
                content:
                  typeof m.content === "string" ? m.content : contentToString(m.content),
              },
            },
          },
        ],
      })
      continue
    }

    const geminiRole = m.role === "assistant" ? "model" : "user"

    if (typeof m.content === "string") {
      contents.push({ role: geminiRole, parts: [{ text: m.content }] })
    } else {
      const parts = m.content.map((p) => {
        if (p.type === "text") return { text: p.text }
        if (p.type === "image") {
          return { inlineData: { mimeType: p.mimeType, data: p.data } }
        }
        return {}
      })
      contents.push({ role: geminiRole, parts })
    }
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: config.maxTokens ?? 4096,
      ...(config.temperature !== undefined ? { temperature: config.temperature } : {}),
    },
  }

  // System instruction
  const systemMsg = messages.find((m) => m.role === "system")
  const systemText = systemMsg
    ? typeof systemMsg.content === "string"
      ? systemMsg.content
      : contentToString(systemMsg.content)
    : config.systemPrompt

  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] }
  }

  if (tools && tools.length > 0) {
    body.tools = [
      {
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    ]
  }

  if (thinking) {
    body.generationConfig = {
      ...(body.generationConfig as object),
      thinkingConfig: { thinkingBudget: 8000 },
    }
  }

  return body
}

async function* streamGemini(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[],
  signal?: AbortSignal,
  thinking?: boolean
): AsyncGenerator<StreamEvent> {
  const model = config.model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${config.apiKey}`

  const body = buildGeminiBody(config, messages, tools, thinking)

  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => res.statusText)
    yield { type: "error", error: `Gemini ${res.status}: ${text}` }
    yield { type: "done" }
    return
  }

  let hadToolCalls = false
  let inputTokens = 0
  let outputTokens = 0

  for await (const line of readLines(res.body, signal)) {
    if (!line.startsWith("data: ")) continue
    const raw = line.slice(6).trim()
    if (!raw) continue

    let chunk: Record<string, unknown>
    try {
      chunk = JSON.parse(raw) as Record<string, unknown>
    } catch {
      continue
    }

    // Usage metadata — candidatesTokenCount holds the output tokens;
    // fall back to outputTokenCount for any future API rename.
    const meta = chunk.usageMetadata as Record<string, number> | undefined
    if (meta) {
      inputTokens = meta.promptTokenCount ?? 0
      outputTokens = meta.candidatesTokenCount ?? meta.outputTokenCount ?? 0
    }

    const candidates = chunk.candidates as Array<Record<string, unknown>> | undefined
    if (!candidates || candidates.length === 0) continue

    const firstCandidate = candidates[0] as Record<string, unknown> | undefined
    const content = firstCandidate?.content as Record<string, unknown> | undefined
    if (!content) continue

    const parts = content.parts as Array<Record<string, unknown>> | undefined
    if (!parts) continue

    for (const part of parts) {
      if (part.thought === true && typeof part.text === "string") {
        yield { type: "thinking", content: part.text }
      } else if (typeof part.text === "string") {
        yield { type: "text", content: part.text }
      } else if (part.functionCall) {
        const fc = part.functionCall as Record<string, unknown>
        const tc: ToolCall = {
          id: (fc.id as string | undefined) ?? `${fc.name as string}-${Date.now()}`,
          name: fc.name as string,
          arguments: (fc.args as Record<string, unknown>) ?? {},
        }
        yield { type: "tool_call", toolCall: tc }
        hadToolCalls = true
      }
    }
  }

  if (hadToolCalls) {
    yield { type: "tool_calls_done" }
  } else {
    yield { type: "done", usage: { input: inputTokens, output: outputTokens } }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Unified streaming LLM generator.
 *
 * Usage:
 * ```ts
 * for await (const event of streamLLM(config, messages)) {
 *   if (event.type === 'text') process(event.content)
 *   if (event.type === 'tool_call') handleTool(event.toolCall)
 * }
 * ```
 *
 * Tool call loop pattern:
 * 1. Stream until `tool_calls_done`
 * 2. Execute each tool, build result LLMMessages with role='tool'
 * 3. Append results to messages array
 * 4. Call streamLLM again — repeat until `done`
 */
export async function* streamLLM(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[],
  options?: { signal?: AbortSignal; thinking?: boolean }
): AsyncGenerator<StreamEvent> {
  const { signal, thinking } = options ?? {}

  try {
    switch (config.provider) {
      case "anthropic":
        yield* streamAnthropic(config, messages, tools, signal, thinking)
        break
      case "openai":
        yield* streamOpenAI(config, messages, tools, signal)
        break
      case "openrouter":
        yield* streamOpenRouter(config, messages, tools, signal)
        break
      case "gemini":
        yield* streamGemini(config, messages, tools, signal, thinking)
        break
      default: {
        const _exhaustive: never = config.provider
        yield { type: "error", error: `Unknown provider: ${_exhaustive}` }
      }
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      yield { type: "done" }
    } else {
      yield { type: "error", error: e instanceof Error ? e.message : String(e) }
    }
  }
}

// ── OpenRouter Model Fetching ─────────────────────────────────────────────────

export interface OpenRouterModel {
  id: string
  name: string
  context_length?: number
  pricing?: {
    prompt: string
    completion: string
  }
}

/**
 * Fetch available models from OpenRouter API
 */
export async function fetchOpenRouterModels(apiKey: string): Promise<OpenRouterModel[]> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
    })

    if (!res.ok) {
      throw new Error(`OpenRouter models API ${res.status}: ${res.statusText}`)
    }

    const data = await res.json() as { data?: OpenRouterModel[] }
    return data.data ?? []
  } catch (e) {
    throw new Error(`Failed to fetch OpenRouter models: ${e instanceof Error ? e.message : String(e)}`)
  }
}
