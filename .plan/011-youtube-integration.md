# Phase 11: YouTube Integration

## Goal
Extract YouTube video transcripts and metadata for AI summarization.

## Detection
- Content script checks if current URL matches `youtube.com/watch`
- If yes, YouTube-specific tools become available
- Side panel could show a "YouTube detected" indicator

## Transcript Extraction (`src/content/tools/youtube.ts`)

### Strategy 1: Parse Player Config (preferred)
1. Look for `ytInitialPlayerResponse` in page's script tags
2. Parse JSON to find `captions.playerCaptionsTracklistRenderer.captionTracks`
3. Get the caption track URL (prefer manual captions > auto-generated)
4. Fetch the timedtext XML URL
5. Parse XML: extract `<text start="..." dur="...">content</text>`
6. Return as array of `{ start: number, duration: number, text: string }`

### Strategy 2: DOM Scraping (fallback)
1. Click "Show transcript" button if it exists
2. Wait for transcript panel to appear
3. Extract text from transcript entries
4. Close transcript panel

### Strategy 3: ytInitialData
1. Parse `ytInitialData` from page scripts
2. Look for engagement panels containing transcript data

### Output Format
```ts
interface TranscriptEntry {
  start: number    // seconds
  duration: number // seconds
  text: string
}

// Formatted for LLM:
// [0:00] Welcome to this video
// [0:05] Today we're going to talk about...
// [1:23] The key insight is...
```

## Video Info Extraction
From `ytInitialPlayerResponse` or `ytInitialData`:
- Title, channel name, channel URL
- Description (full text)
- Duration, view count, like count
- Publish date
- Tags, category
- Thumbnail URL

## LLM Context
When user asks about a YouTube video, the system prompt includes:
```
You are analyzing a YouTube video. Here is the video information:
Title: {title}
Channel: {channel}
Duration: {duration}
Description: {description}

Transcript:
{formatted_transcript}
```

## Files to Create/Modify
- `src/content/tools/youtube.ts` - Transcript & info extraction
- Modify system prompt to include YouTube context when detected

## Acceptance
- Transcript extracted from a YouTube video with captions
- Auto-generated captions work as fallback
- Video metadata correctly parsed
- LLM can answer questions about video content
- Works with different YouTube page layouts (standard, shorts detection/skip)
