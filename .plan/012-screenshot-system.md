# Phase 12: Screenshot System

## Goal
Capture viewport or element screenshots and send them to the LLM as images.

## Implementation

### Viewport Screenshot
- Background uses `chrome.tabs.captureVisibleTab(tabId, { format: 'png' })`
- Returns base64 PNG data URL
- Sent to LLM as image content part

### Element Screenshot
1. Content script receives `page_screenshot` with `selector`
2. Content script queries element, gets `getBoundingClientRect()`
3. Sends bounding rect back to background
4. Background captures full viewport with `captureVisibleTab()`
5. Background crops image to bounding rect using `OffscreenCanvas` API
   - Create OffscreenCanvas in service worker
   - Draw full image, then extract the element region
6. Returns cropped base64 PNG

### Full Page Screenshot (optional, complex)
- Scroll through page, capture each viewport
- Stitch together using OffscreenCanvas
- May be too heavy; could limit to visible viewport only
- Mark as stretch goal

### Size Optimization
- Resize large screenshots to max 1024px width before sending to LLM
- JPEG compression for large images (quality 85)
- This reduces token cost and latency

### LLM Integration
Screenshots sent as image content parts:
- **Anthropic**: `{ type: "image", source: { type: "base64", media_type: "image/png", data: "..." } }`
- **OpenAI**: `{ type: "image_url", image_url: { url: "data:image/png;base64,..." } }`
- **Gemini**: `{ inlineData: { mimeType: "image/png", data: "..." } }`

Normalization handled in `llms.ts`.

## Files to Create/Modify
- `src/content/tools/screenshot.ts` - Element bounding rect, scroll-to-element
- `src/background/screenshot.ts` - captureVisibleTab, crop, resize
- Modify `src/shared/llms.ts` - Image content part handling per provider

## Acceptance
- Viewport screenshot captured and sent to LLM
- Element screenshot correctly cropped
- Images resized for efficiency
- All 3 providers receive images in correct format
- LLM can describe what it sees in the screenshot
