// Hook for loading and saving extension settings

import { useState, useEffect, useCallback } from "react"
import { sendToBackground } from "../../shared/messages"
import { DEFAULT_SETTINGS, type Settings } from "../../shared/settings"

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await sendToBackground<null, Settings>("settings:get", null)
        if (res.success && res.data) {
          setSettings(res.data)
        }
      } catch (e) {
        console.error("[TabFlow] useSettings: failed to load", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const save = useCallback(async (partial: Partial<Settings>) => {
    try {
      const res = await sendToBackground<Partial<Settings>, Settings>("settings:set", partial)
      if (res.success && res.data) {
        setSettings(res.data)
        return res.data
      }
    } catch (e) {
      console.error("[TabFlow] useSettings: failed to save", e)
    }
    return null
  }, [])

  return { settings, loading, save }
}
