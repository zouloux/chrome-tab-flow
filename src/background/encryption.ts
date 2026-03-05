import {
  ENCRYPTION_SALT,
  ENCRYPTION_ALGO,
  KEY_LENGTH,
  KEY_DERIVATION_ITERATIONS,
} from "../shared/constants"

interface StoredEncryptionKey {
  key: string
  iv: string
  created: number
}

const STORAGE_KEY = "tabflow:encryption_key"

const decryptedCache = new Map<string, string>()

let cryptoKey: CryptoKey | null = null

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ""
  const len = bytes.length
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function deriveKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: ENCRYPTION_SALT,
      iterations: KEY_DERIVATION_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ENCRYPTION_ALGO, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  )
}

function generateRandomPassword(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return uint8ArrayToBase64(array)
}

async function storeEncryptionKey(key: CryptoKey): Promise<void> {
  const exportedKey = await crypto.subtle.exportKey("raw", key)
  const keyBytes = new Uint8Array(exportedKey)
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)

  const stored: StoredEncryptionKey = {
    key: uint8ArrayToBase64(keyBytes),
    iv: uint8ArrayToBase64(iv),
    created: Date.now(),
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: stored })
}

async function loadEncryptionKey(): Promise<CryptoKey | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  const stored = result[STORAGE_KEY] as StoredEncryptionKey | undefined

  if (!stored) return null

  const keyBytes = base64ToUint8Array(stored.key)
  return crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: ENCRYPTION_ALGO, length: KEY_LENGTH },
    true,
    ["encrypt", "decrypt"]
  )
}

/**
 * Initialize encryption key. Generates a new key if none exists.
 */
export async function initEncryption(): Promise<void> {
  const existingKey = await loadEncryptionKey()
  if (existingKey) {
    cryptoKey = existingKey
    return
  }

  const password = generateRandomPassword()
  cryptoKey = await deriveKey(password)
  await storeEncryptionKey(cryptoKey)
}

/**
 * Encrypt an API key and return base64 encoded ciphertext.
 */
export async function encryptApiKey(plaintext: string): Promise<string> {
  if (!cryptoKey) {
    throw new Error("Encryption not initialized")
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)

  const ciphertext = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGO, iv },
    cryptoKey,
    data
  )

  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return uint8ArrayToBase64(combined)
}

/**
 * Decrypt an API key from base64 encoded ciphertext.
 */
export async function decryptApiKey(ciphertext: string): Promise<string> {
  if (!cryptoKey) {
    throw new Error("Encryption not initialized")
  }

  const combined = base64ToUint8Array(ciphertext)
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGO, iv },
    cryptoKey,
    data
  )

  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

/**
 * Clear the RAM cache of decrypted API keys.
 */
export function clearDecryptedCache(): void {
  decryptedCache.clear()
}

/**
 * Get a decrypted API key from the RAM cache.
 */
export function getDecryptedKey(provider: string): string | undefined {
  return decryptedCache.get(provider)
}

/**
 * Store a decrypted API key in the RAM cache.
 */
export function setDecryptedKey(provider: string, key: string): void {
  decryptedCache.set(provider, key)
}
