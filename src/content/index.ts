// TabFlow content script
// Handles DOM operations, element picker, screenshots

import type { Message, Response } from "../shared/messages"
import { ok, err } from "../shared/messages"

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

    default:
      console.warn("[TabFlow] content: unhandled message type", message.type)
      return err(`Unknown message type: ${message.type}`, message.requestId)
  }
}

export {}
