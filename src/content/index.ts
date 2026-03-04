// TabFlow content script
// Handles DOM operations, element picker, screenshots

import type { Message, Response } from "../shared/messages"
import { ok, err } from "../shared/messages"
import { executeTool, contentTools } from "./tools"

console.log("[TabFlow] content script loaded on", location.href)

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse: (r: Response) => void) => {
    console.log("[TabFlow] content: received", message.type)

    handleMessage(message).then(sendResponse)
    return true // async response
  }
)

async function handleMessage(message: Message): Promise<Response> {
  switch (message.type) {
    case "ping": {
      console.log("[TabFlow] content: pong!")
      return ok("pong", message.requestId)
    }

    case "tool:execute": {
      const payload = message.payload as { name: string; params: unknown } | undefined
      if (!payload?.name) {
        return err("Missing tool name", message.requestId)
      }

      console.log("[TabFlow] content: executing tool", payload.name)

      if (!contentTools[payload.name]) {
        return err(`Unknown tool: ${payload.name}`, message.requestId)
      }

      try {
        const result = await executeTool(payload.name, payload.params)
        return ok(result, message.requestId)
      } catch (e) {
        return err(e instanceof Error ? e.message : String(e), message.requestId)
      }
    }

    default:
      console.warn("[TabFlow] content: unhandled message type", message.type)
      return err(`Unknown message type: ${message.type}`, message.requestId)
  }
}

export {}
