/**
 * Integration tests for src/shared/llms.ts
 *
 * Each provider is tested independently and is SKIPPED when its API key is
 * absent from the environment (copy .env.example → .env and fill in keys).
 *
 * Bun loads .env automatically, so no extra setup is required.
 *
 * Run:
 *   bun test
 *   bun test --timeout 30000   # longer timeout for slow providers
 */

import { describe, test, expect } from "bun:test"
import { streamLLM } from "../src/shared/llms"
import type { LLMConfig, LLMMessage, ToolDefinition, StreamEvent } from "../src/shared/types"

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Collect all events from the generator into an array. */
async function collect(
  config: LLMConfig,
  messages: LLMMessage[],
  tools?: ToolDefinition[],
  opts?: { signal?: AbortSignal; thinking?: boolean }
): Promise<StreamEvent[]> {
  const events: StreamEvent[] = []
  for await (const evt of streamLLM(config, messages, tools, opts)) {
    events.push(evt)
  }
  return events
}

/** Join all text chunks into one string. */
function fullText(events: StreamEvent[]): string {
  return events
    .filter((e) => e.type === "text")
    .map((e) => e.content ?? "")
    .join("")
}

/** Extract tool calls from an event list. */
function toolCalls(events: StreamEvent[]) {
  return events.filter((e) => e.type === "tool_call").map((e) => e.toolCall!)
}

/** Placeholder tool definition used across all providers. */
const weatherTool: ToolDefinition = {
  name: "get_weather",
  description: "Get the current weather for a city.",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name" },
    },
    required: ["city"],
  },
}

const simpleMessages: LLMMessage[] = [
  { role: "user", content: 'Reply with exactly the word "pong" and nothing else.' },
]

const toolMessages: LLMMessage[] = [
  {
    role: "user",
    content: "What is the weather in Paris? Use the get_weather tool.",
  },
]

// ── Provider table ─────────────────────────────────────────────────────────────
//
// To add a new provider in the future, add one entry here.
// No test code needs to change.

interface ProviderFixture {
  provider: LLMConfig["provider"]
  envKey: string
  model: string
}

const PROVIDERS: ProviderFixture[] = [
  { provider: "anthropic", envKey: "ANTHROPIC_API_KEY", model: "claude-haiku-4-5" },
  { provider: "openai",    envKey: "OPENAI_API_KEY",    model: "gpt-4o-mini" },
  { provider: "gemini",    envKey: "GEMINI_API_KEY",    model: "gemini-2.5-flash" },
]

// ── Test suite ────────────────────────────────────────────────────────────────

for (const { provider, envKey, model } of PROVIDERS) {
  const apiKey = process.env[envKey] ?? ""
  const hasKey = apiKey.length > 0 && !apiKey.startsWith("sk-...") && !apiKey.includes("your")

  // Each provider gets its own describe block — easy to filter with `bun test --testNamePattern`
  describe(`${provider} (${model})`, () => {

    // ── 1. Basic text streaming ───────────────────────────────────────────────
    test("streams a simple text reply", async () => {
      if (!hasKey) {
        console.log(`  [skip] ${envKey} not set`)
        return
      }

      const config: LLMConfig = { provider, apiKey, model, maxTokens: 64 }
      const events = await collect(config, simpleMessages)

      const text = fullText(events).toLowerCase()
      const lastEvent = events.at(-1)

      expect(text).toContain("pong")
      expect(lastEvent?.type).toBe("done")
    })

    // ── 2. Usage metadata returned ────────────────────────────────────────────
    test("returns usage in done event", async () => {
      if (!hasKey) return

      const config: LLMConfig = { provider, apiKey, model, maxTokens: 64 }
      const events = await collect(config, simpleMessages)

      const done = events.find((e) => e.type === "done")
      expect(done).toBeDefined()
      expect(done?.usage?.input).toBeGreaterThan(0)
      expect(done?.usage?.output).toBeGreaterThan(0)
    })

    // ── 3. System prompt respected ────────────────────────────────────────────
    test("respects system prompt", async () => {
      if (!hasKey) return

      const config: LLMConfig = {
        provider,
        apiKey,
        model,
        maxTokens: 64,
        systemPrompt: 'You are a robot. Always reply with "BEEP BOOP" and nothing else.',
      }
      const events = await collect(config, [{ role: "user", content: "Hello!" }])
      const text = fullText(events).toUpperCase()

      expect(text).toContain("BEEP")
    })

    // ── 4. Tool call parsing ──────────────────────────────────────────────────
    test("parses tool calls", async () => {
      if (!hasKey) return

      const config: LLMConfig = { provider, apiKey, model, maxTokens: 256 }
      const events = await collect(config, toolMessages, [weatherTool])

      const calls = toolCalls(events)
      expect(calls.length).toBeGreaterThan(0)

      const call = calls[0]!
      expect(call.name).toBe("get_weather")
      expect(typeof call.id).toBe("string")
      expect(call.id.length).toBeGreaterThan(0)
      expect(typeof call.arguments.city).toBe("string")

      const hasDone = events.some((e) => e.type === "tool_calls_done")
      expect(hasDone).toBe(true)
    })

    // ── 5. Tool result round-trip ─────────────────────────────────────────────
    test("handles tool result and produces final answer", async () => {
      if (!hasKey) return

      const config: LLMConfig = { provider, apiKey, model, maxTokens: 256 }

      // First turn: get the tool call
      const firstEvents = await collect(config, toolMessages, [weatherTool])
      const calls = toolCalls(firstEvents)
      if (calls.length === 0) {
        // Provider chose not to call the tool — acceptable, skip rest
        return
      }
      const call = calls[0]!

      // Second turn: provide the tool result.
      // Anthropic and OpenAI both require the assistant turn to include the
      // tool_use / tool_calls so they can match the subsequent tool_result.
      const assistantText = firstEvents
        .filter((e) => e.type === "text")
        .map((e) => e.content ?? "")
        .join("")

      const messages: LLMMessage[] = [
        ...toolMessages,
        {
          role: "assistant" as const,
          content: assistantText,
          toolCalls: calls,
        },
        {
          role: "tool" as const,
          content: JSON.stringify({ temperature: "18°C", condition: "Partly cloudy" }),
          toolCallId: call.id,
          toolName: call.name,
        },
      ]

      const secondEvents = await collect(config, messages, [weatherTool])
      const finalText = fullText(secondEvents).toLowerCase()

      // Should mention the city or the weather result
      expect(finalText.length).toBeGreaterThan(5)
      expect(secondEvents.at(-1)?.type).toBe("done")
    })

    // ── 6. AbortSignal cancels stream ─────────────────────────────────────────
    test("AbortSignal cancels the stream cleanly", async () => {
      if (!hasKey) return

      const controller = new AbortController()
      const config: LLMConfig = { provider, apiKey, model, maxTokens: 512 }

      const longMessages: LLMMessage[] = [
        { role: "user", content: "Count from 1 to 100, each number on its own line." },
      ]

      let eventCount = 0
      let lastType = ""

      for await (const evt of streamLLM(config, longMessages, undefined, {
        signal: controller.signal,
      })) {
        eventCount++
        lastType = evt.type
        if (eventCount >= 3) {
          controller.abort()
          // Keep consuming until generator returns
        }
      }

      // Generator must eventually stop; last event is 'done' or 'error' (not hanging)
      expect(["done", "error"]).toContain(lastType)
    })

  })
}
