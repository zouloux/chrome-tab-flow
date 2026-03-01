# Phase 8: Settings Panel

## Goal
Build the settings UI for API keys, model selection, and preferences.

## Settings Schema
```ts
interface Settings {
  // API Keys
  anthropicApiKey: string
  openaiApiKey: string
  geminiApiKey: string

  // Default provider & model
  defaultProvider: LLMProvider
  defaultModel: string  // e.g. "claude-sonnet-4-20250514", "gpt-4o", "gemini-2.0-flash"

  // Preferences
  showReasoning: boolean     // Show thinking/reasoning blocks
  maxTokens: number          // Default max tokens (2048)
  temperature: number        // Default temperature (0.7)
}
```

## UI Layout
```
Settings (full panel overlay, slide from right or replace chat view)
├── Section: API Keys
│   ├── Anthropic API Key (password input, show/hide toggle)
│   ├── OpenAI API Key (password input, show/hide toggle)
│   └── Google Gemini API Key (password input, show/hide toggle)
├── Section: Model
│   ├── Default Provider (dropdown: Anthropic / OpenAI / Gemini)
│   ├── Default Model (dropdown, options change based on provider)
│   └── [Info text showing available models per provider]
├── Section: Preferences
│   ├── Show Reasoning (toggle switch)
│   ├── Max Tokens (number input, 256-8192)
│   └── Temperature (slider, 0.0-1.0)
└── Back button (top left, returns to chat)
```

## Model Lists (hardcoded, can be updated)
**Anthropic**: claude-sonnet-4-20250514, claude-opus-4-20250514
**OpenAI**: gpt-4o, gpt-4o-mini, o1, o1-mini, o3-mini
**Gemini**: gemini-2.0-flash, gemini-2.0-pro, gemini-2.5-flash, gemini-2.5-pro

## Storage
- All settings stored in `chrome.storage.local`
- API keys stored as plaintext (chrome.storage is per-extension, sandboxed)
- Settings load on side panel mount
- Changes save immediately on input change (debounced 500ms)
- Background service worker reads settings when starting LLM calls

## Files to Create
- `src/sidepanel/components/SettingsPanel.tsx`
- `src/sidepanel/components/SettingsSection.tsx` (reusable section wrapper)
- `src/sidepanel/components/Toggle.tsx` (toggle switch component)
- `src/sidepanel/hooks/useSettings.ts` - Load/save settings hook
- `src/shared/settings.ts` - Settings type, defaults, storage helpers

## Acceptance
- All settings fields render and are editable
- Settings persist across panel close/reopen
- Changing provider updates model dropdown
- API keys are masked by default with show/hide toggle
- Background reads settings correctly when making LLM calls
