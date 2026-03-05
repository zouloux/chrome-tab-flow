# Phase 015: API Key Encryption

## Goal
Implement client-side encryption for API keys using Web Crypto API. Keys are encrypted at rest in Chrome storage, decrypted on-demand with RAM caching for performance.

## Security Model
- **Not perfect security** - The encryption key is stored alongside encrypted data. This is a tradeoff for usability (keys persist across reboots without user password).
- **Protection goal** - Prevent casual viewing of API keys in storage, protect against simple storage inspection attacks.
- **Hardcoded salt** - Adds obfuscation layer to key derivation.

## Architecture

### Storage Schema Changes
```
chrome.storage.local:
  tabflow:encryption_key  → { key: string (base64), iv: string (base64), created: number }
  tabflow:settings        → {
    anthropicApiKeyEnc: string | null   // encrypted, base64
    openaiApiKeyEnc: string | null
    geminiApiKeyEnc: string | null
    openrouterApiKeyEnc: string | null
    ...other settings unchanged
  }
```

### Encryption Layer (src/background/encryption.ts)
- `initEncryption()` - Generate/load encryption key on first use
- `encryptApiKey(plaintext: string)` → string (base64)
- `decryptApiKey(ciphertext: string)` → string
- Internal RAM cache: `Map<provider, decryptedKey>`

### Constants (src/shared/constants.ts)
```ts
export const ENCRYPTION_SALT = "tabflow-v1-salt-7f3a9c2e"
export const ENCRYPTION_ALGO = "AES-GCM"
export const KEY_LENGTH = 256
```

## Files to Create/Modify

### New Files
1. `src/shared/constants.ts` - Salt and encryption constants
2. `src/background/encryption.ts` - Web Crypto API encryption module

### Modified Files
1. `src/shared/settings.ts` - Add encrypted field types
2. `src/background/storage.ts` - Handle encrypted API keys
3. `src/background/index.ts` - Initialize encryption, intercept settings operations
4. `src/sidepanel/components/SettingsPanel.tsx` - New ApiKeyInput behavior

## Implementation Steps

### Step 1: Constants
Create `src/shared/constants.ts` with salt and algorithm constants.

### Step 2: Encryption Module
Create `src/background/encryption.ts`:
- Use `crypto.subtle` for AES-GCM encryption
- Key derivation: PBKDF2 with hardcoded salt + random IV
- RAM cache for decrypted keys
- Functions: `initEncryption()`, `encryptApiKey()`, `decryptApiKey()`, `clearCache()`

### Step 3: Settings Types Update
Modify `src/shared/settings.ts`:
- Keep original field names for backward compatibility in code
- Add helper type for encrypted storage format

### Step 4: Storage Layer Update
Modify `src/background/storage.ts`:
- `getSettings()` - Decrypt API keys before returning (transparent to callers)
- `saveSettings()` - Encrypt API keys before storing
- Handle migration: if old plaintext keys exist, encrypt them

### Step 5: Background Service Worker Update
Modify `src/background/index.ts`:
- Call `initEncryption()` on startup
- Handle `settings:get` and `settings:set` with encryption

### Step 6: UI Component Update
Modify `src/sidepanel/components/SettingsPanel.tsx`:
- Remove eye icon toggle button
- Show masked value "••••••••••••" when key exists
- On focus: clear field visually, allow user to enter new key
- On blur: if empty, restore masked display; if not empty, save new key

## Key Behaviors

### First-Time Setup
1. User opens settings, pastes API key
2. Key is encrypted and stored
3. RAM cache is populated
4. UI shows masked value

### Subsequent Loads
1. Extension starts → `initEncryption()` loads encryption key
2. Settings are requested → keys are decrypted on-demand, cached in RAM
3. LLM calls use cached decrypted keys

### Changing a Key
1. User focuses the input field → field clears
2. User pastes new key → field shows characters (password mode)
3. On blur/change → new key is encrypted, saved, cache updated
4. UI shows masked value again

### Migration
1. On first run after update, check for plaintext keys
2. If found, encrypt them and remove plaintext versions
3. This happens transparently in `getSettings()`/`saveSettings()`

## Acceptance Criteria
- [ ] API keys are stored encrypted in chrome.storage.local
- [ ] Extension remembers keys across restarts
- [ ] LLM calls work with encrypted keys
- [ ] UI shows masked values, no eye icon
- [ ] User can change keys by focusing field and entering new value
- [ ] Existing plaintext keys are migrated on first use
- [ ] RAM cache prevents repeated decryption overhead

## Notes
- Web Crypto API is available in service workers (Chrome Extension context)
- AES-GCM provides authenticated encryption
- IV is stored with the key for deterministic decryption
- Salt is hardcoded for simplicity (not a security feature, just obfuscation)
