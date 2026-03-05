// Shared constants for TabFlow extension

export const EXT_NAME = "TabFlow"
export const EXT_VERSION = "0.1.0"

export const MSG = {
  CHAT_MESSAGE: "CHAT_MESSAGE",
  CHAT_RESPONSE: "CHAT_RESPONSE",
  GET_PAGE_CONTENT: "GET_PAGE_CONTENT",
  PAGE_CONTENT: "PAGE_CONTENT",
} as const

export const ENCRYPTION_SALT = new Uint8Array([
  0x54, 0x61, 0x62, 0x46, 0x6c, 0x6f, 0x77, 0x53,
  0x61, 0x6c, 0x74, 0x56, 0x61, 0x6c, 0x75, 0x65
])

export const ENCRYPTION_ALGO = "AES-GCM"
export const KEY_LENGTH = 256
export const KEY_DERIVATION_ITERATIONS = 100000
