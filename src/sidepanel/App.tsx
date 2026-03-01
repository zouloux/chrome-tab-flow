// TabFlow side panel React app

import { useEffect, useState } from "react"
import { sendToBackground } from "../shared/messages"

type ConnectionStatus = "checking" | "connected" | "error"

export function App() {
  const [status, setStatus] = useState<ConnectionStatus>("checking")
  const [errorMsg, setErrorMsg] = useState<string>("")

  useEffect(() => {
    async function ping() {
      console.log("[TabFlow] sidepanel: sending ping via background…")
      try {
        const response = await sendToBackground<null, string>("ping", null)
        if (response.success && response.data === "pong") {
          console.log("[TabFlow] sidepanel: pong received – round-trip OK")
          setStatus("connected")
        } else {
          console.warn("[TabFlow] sidepanel: unexpected response", response)
          setErrorMsg(response.error ?? "Unexpected response")
          setStatus("error")
        }
      } catch (e) {
        console.error("[TabFlow] sidepanel: ping failed", e)
        setErrorMsg(String(e))
        setStatus("error")
      }
    }
    ping()
  }, [])

  return (
    <div className="flex flex-col h-screen p-4 bg-zinc-900 text-zinc-100 font-mono">
      <h1 className="text-xl font-bold text-indigo-400 mb-4">TabFlow</h1>

      <div className="flex items-center gap-2 text-sm">
        {status === "checking" && (
          <>
            <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-zinc-400">Checking connection…</span>
          </>
        )}
        {status === "connected" && (
          <>
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-green-400">Connected – round-trip OK</span>
          </>
        )}
        {status === "error" && (
          <>
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-red-400">Connection error: {errorMsg}</span>
          </>
        )}
      </div>
    </div>
  )
}
