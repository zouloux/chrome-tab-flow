// Settings panel component - full settings UI for API keys, model, and preferences

import { useState, useEffect, useCallback, useRef } from "react"
import { useSettings } from "../hooks/useSettings"
import { SettingsSection } from "./SettingsSection"
import { Toggle } from "./Toggle"
import { MODEL_OPTIONS, type Settings } from "../../shared/settings"
import type { LLMProvider } from "../../shared/types"
import { fetchOpenRouterModels, type OpenRouterModel } from "../../shared/llms"

interface SettingsPanelProps {
  onBack: () => void
}

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
}

function IconBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3L5 8l5 5" />
    </svg>
  )
}

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3c-4 0-7 3-7 7s3 7 7 7 7-3 7-7-3-7-7-7z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2l12 12" />
      <path d="M8 3c-4 0-7 3-7 7s2.5 5 5 5M8 13c4 0 7-3 7-7s-2.5-5-5-5" />
      <path d="M3 9h.01M13 9h.01" />
    </svg>
  )
}

interface ApiKeyInputProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function ApiKeyInput({ label, value, onChange }: ApiKeyInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="mb-4 last:mb-0">
      <label className="block text-xs mb-1.5" style={{ color: "#a0a0a0" }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="sk-..."
          className="flex-1 px-3 py-2 rounded text-sm outline-none transition-colors"
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#e5e5e5",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#3b82f6"
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#2a2a2a"
          }}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="flex items-center justify-center rounded transition-colors"
          style={{
            width: "32px",
            height: "32px",
            backgroundColor: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#a0a0a0",
          }}
        >
          {visible ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
    </div>
  )
}

function Select({
  value,
  options,
  onChange,
  label,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  label?: string
}) {
  return (
    <div className="mb-4 last:mb-0">
      {label && (
        <label className="block text-xs mb-1.5" style={{ color: "#a0a0a0" }}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded text-sm outline-none transition-colors appearance-none"
        style={{
          backgroundColor: "#1a1a1a",
          border: "1px solid #2a2a2a",
          color: "#e5e5e5",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#3b82f6"
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#2a2a2a"
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function SearchableModelSelect({
  value,
  models,
  onChange,
  label,
  loading,
  error,
  searchQuery,
  onSearchChange,
}: {
  value: string
  models: OpenRouterModel[]
  onChange: (value: string) => void
  label?: string
  loading?: boolean
  error?: string | null
  searchQuery: string
  onSearchChange: (query: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const filteredModels = models.filter((m) =>
    m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedModel = models.find((m) => m.id === value)

  return (
    <div className="mb-4 last:mb-0" ref={dropdownRef}>
      {label && (
        <label className="block text-xs mb-1.5" style={{ color: "#a0a0a0" }}>
          {label}
        </label>
      )}

      {loading ? (
        <div
          className="w-full px-3 py-2 rounded text-sm"
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#666666",
          }}
        >
          Loading models...
        </div>
      ) : error ? (
        <div
          className="w-full px-3 py-2 rounded text-sm"
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #ef4444",
            color: "#ef4444",
          }}
        >
          {error}
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-3 py-2 rounded text-sm outline-none transition-colors text-left"
            style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #2a2a2a",
              color: "#e5e5e5",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#3b82f6"
            }}
            onBlur={(e) => {
              if (!isOpen) e.currentTarget.style.borderColor = "#2a2a2a"
            }}
          >
            {selectedModel ? selectedModel.id : value || "Select a model..."}
          </button>

          {isOpen && (
            <div
              className="absolute z-10 w-full mt-1 rounded overflow-hidden"
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                maxHeight: "300px",
              }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search models..."
                className="w-full px-3 py-2 text-sm outline-none sticky top-0"
                style={{
                  backgroundColor: "#141414",
                  border: "none",
                  borderBottom: "1px solid #2a2a2a",
                  color: "#e5e5e5",
                }}
                autoFocus
              />
              <div className="overflow-y-auto" style={{ maxHeight: "250px" }}>
                {filteredModels.length === 0 ? (
                  <div className="px-3 py-2 text-sm" style={{ color: "#666666" }}>
                    No models found
                  </div>
                ) : (
                  filteredModels.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        onChange(model.id)
                        setIsOpen(false)
                        onSearchChange("")
                      }}
                      className="w-full px-3 py-2 text-sm text-left transition-colors"
                      style={{
                        backgroundColor: model.id === value ? "#1e1e1e" : "transparent",
                        color: "#e5e5e5",
                        border: "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#1e1e1e"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          model.id === value ? "#1e1e1e" : "transparent"
                      }}
                    >
                      <div>{model.id}</div>
                      {model.name && model.name !== model.id && (
                        <div className="text-xs" style={{ color: "#666666" }}>
                          {model.name}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SettingsPanel({ onBack }: SettingsPanelProps) {
  const { settings, loading, save } = useSettings()
  const [localSettings, setLocalSettings] = useState<Settings | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [openrouterModels, setOpenrouterModels] = useState<OpenRouterModel[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [modelSearchQuery, setModelSearchQuery] = useState("")

  useEffect(() => {
    if (!loading) {
      setLocalSettings(settings)
    }
  }, [loading, settings])

  // Fetch OpenRouter models when provider is openrouter and API key is set
  useEffect(() => {
    if (
      localSettings?.defaultProvider === "openrouter" &&
      localSettings.openrouterApiKey &&
      openrouterModels.length === 0
    ) {
      setLoadingModels(true)
      setModelsError(null)
      fetchOpenRouterModels(localSettings.openrouterApiKey)
        .then((models) => {
          setOpenrouterModels(models)
          setLoadingModels(false)
        })
        .catch((err) => {
          setModelsError(err instanceof Error ? err.message : String(err))
          setLoadingModels(false)
        })
    }
  }, [localSettings?.defaultProvider, localSettings?.openrouterApiKey, openrouterModels.length])

  const updateSettings = useCallback(
    (updates: Partial<Settings>) => {
      if (!localSettings) return

      const updated = { ...localSettings, ...updates }
      setLocalSettings(updated)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        save(updates)
      }, 500)
    },
    [localSettings, save]
  )

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      updateSettings({ [key]: value })
    },
    [updateSettings]
  )

  if (loading || !localSettings) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: "#0a0a0a" }}>
        <div
          className="flex items-center gap-3 px-3"
          style={{ height: "40px", borderBottom: "1px solid #2a2a2a", flexShrink: 0 }}
        >
          <button
            onClick={onBack}
            className="flex items-center justify-center rounded transition-colors"
            style={{ width: "28px", height: "28px", color: "#a0a0a0" }}
          >
            <IconBack />
          </button>
          <span className="text-sm font-semibold" style={{ color: "#e5e5e5" }}>
            Settings
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span style={{ color: "#666666" }}>Loading...</span>
        </div>
      </div>
    )
  }

  const providerOptions: { value: LLMProvider; label: string }[] = [
    { value: "anthropic", label: "Anthropic" },
    { value: "openai", label: "OpenAI" },
    { value: "gemini", label: "Google Gemini" },
    { value: "openrouter", label: "OpenRouter" },
  ]

  const currentProvider = localSettings.defaultProvider || "anthropic"
  const modelOptions = (MODEL_OPTIONS[currentProvider] || []).map((model) => ({
    value: model,
    label: model,
  }))

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: "#0a0a0a" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-3"
        style={{ height: "40px", borderBottom: "1px solid #2a2a2a", flexShrink: 0 }}
      >
        <button
          onClick={onBack}
          className="flex items-center justify-center rounded transition-colors"
          style={{ width: "28px", height: "28px", color: "#a0a0a0" }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = "#e5e5e5"
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1e1e1e"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.color = "#a0a0a0"
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"
          }}
        >
          <IconBack />
        </button>
        <span className="text-sm font-semibold" style={{ color: "#e5e5e5" }}>
          Settings
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* API Keys */}
        <SettingsSection title="API Keys">
          <ApiKeyInput
            label="Anthropic API Key"
            value={localSettings.anthropicApiKey}
            onChange={(v) => updateSetting("anthropicApiKey", v)}
          />
          <ApiKeyInput
            label="OpenAI API Key"
            value={localSettings.openaiApiKey}
            onChange={(v) => updateSetting("openaiApiKey", v)}
          />
          <ApiKeyInput
            label="Google Gemini API Key"
            value={localSettings.geminiApiKey}
            onChange={(v) => updateSetting("geminiApiKey", v)}
          />
          <ApiKeyInput
            label="OpenRouter API Key"
            value={localSettings.openrouterApiKey}
            onChange={(v) => updateSetting("openrouterApiKey", v)}
          />
        </SettingsSection>

        {/* Model */}
        <SettingsSection title="Model">
          <Select
            label="Default Provider"
            value={localSettings.defaultProvider}
            options={providerOptions}
            onChange={(v) => {
              const provider = v as LLMProvider
              updateSettings({
                defaultProvider: provider,
                defaultModel: (MODEL_OPTIONS[provider] || [])[0] || "",
              })
            }}
          />
          {currentProvider === "openrouter" ? (
            <SearchableModelSelect
              label="Default Model"
              value={localSettings.defaultModel}
              models={openrouterModels}
              loading={loadingModels}
              error={modelsError}
              searchQuery={modelSearchQuery}
              onSearchChange={setModelSearchQuery}
              onChange={(v) => updateSetting("defaultModel", v)}
            />
          ) : (
            <Select
              label="Default Model"
              value={localSettings.defaultModel}
              options={modelOptions}
              onChange={(v) => updateSetting("defaultModel", v)}
            />
          )}
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title="Preferences">
          <div className="mb-4">
            <Toggle
              checked={localSettings.showReasoning}
              onChange={(v) => updateSetting("showReasoning", v)}
              label="Show reasoning/thinking"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs mb-1.5" style={{ color: "#a0a0a0" }}>
              Max Tokens (256-8192)
            </label>
            <input
              type="number"
              min={256}
              max={8192}
              value={localSettings.maxTokens}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v >= 256 && v <= 8192) {
                  updateSetting("maxTokens", v)
                }
              }}
              className="w-full px-3 py-2 rounded text-sm outline-none transition-colors"
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                color: "#e5e5e5",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6"
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a"
              }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: "#a0a0a0" }}>
              Temperature: {localSettings.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={localSettings.temperature}
              onChange={(e) => updateSetting("temperature", parseFloat(e.target.value))}
              className="w-full"
              style={{
                accentColor: "#3b82f6",
              }}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: "#666666" }}>
              <span>Precise</span>
              <span>Creative</span>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
