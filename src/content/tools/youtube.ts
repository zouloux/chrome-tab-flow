// YouTube-specific tools - content script implementations

import type {
  YouTubeTranscriptResult,
  YouTubeVideoInfoResult,
  ToolResult,
} from "../../shared/tool-types"

// ── youtube_get_transcript ──────────────────────────────────────────────────────

export async function youtubeGetTranscript(): Promise<ToolResult<YouTubeTranscriptResult>> {
  try {
    if (!isYouTubeVideoPage()) {
      return { success: false, error: "Not a YouTube video page" }
    }

    const segments = await extractTranscript()
    if (segments.length === 0) {
      return { success: false, error: "Could not extract transcript" }
    }

    const fullText = segments.map((s) => s.text).join(" ")

    return {
      success: true,
      data: { segments, fullText },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── youtube_get_video_info ───────────────────────────────────────────────────────

export async function youtubeGetVideoInfo(): Promise<ToolResult<YouTubeVideoInfoResult>> {
  try {
    if (!isYouTubeVideoPage()) {
      return { success: false, error: "Not a YouTube video page" }
    }

    const info = extractVideoInfo()
    if (!info) {
      return { success: false, error: "Could not extract video info" }
    }

    return { success: true, data: info }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function isYouTubeVideoPage(): boolean {
  const hostname = window.location.hostname
  if (!hostname.includes("youtube.com") && !hostname.includes("youtu.be")) {
    return false
  }
  const pathname = window.location.pathname
  if (pathname === "/watch") return true
  if (pathname.startsWith("/shorts/")) return true
  if (hostname === "youtu.be" && pathname.length > 1) return true
  return false
}

async function extractTranscript(): Promise<
  Array<{ start: number; duration: number; text: string }>
> {
  // Method 1: Try to get from ytInitialPlayerResponse
  const ytData = extractYtInitialData()
  if (ytData) {
    const segments = extractFromYtData(ytData)
    if (segments.length > 0) return segments
  }

  // Method 2: Try to find caption track URLs in the page
  const captionUrl = findCaptionTrackUrl()
  if (captionUrl) {
    const segments = await fetchCaptionTrack(captionUrl)
    if (segments.length > 0) return segments
  }

  // Method 3: Try to click the "Show transcript" button and parse
  const segments = await extractFromTranscriptPanel()
  if (segments.length > 0) return segments

  return []
}

function extractYtInitialData(): Record<string, unknown> | null {
  const scripts = Array.from(document.querySelectorAll("script"))
  for (const script of scripts) {
    const text = script.textContent || ""
    if (text.includes("var ytInitialData =")) {
      try {
        const match = text.match(/var ytInitialData = ({[\s\S]*?});/)
        if (match && match[1]) {
          return JSON.parse(match[1]) as Record<string, unknown>
        }
      } catch {
        continue
      }
    }
  }
  return null
}

function extractFromYtData(
  data: Record<string, unknown>
): Array<{ start: number; duration: number; text: string }> {
  const segments: Array<{ start: number; duration: number; text: string }> = []

  try {
    const playerResponse = data.playerResponse as Record<string, unknown> | undefined
    if (!playerResponse) return segments

    const captions = (playerResponse.captions as Record<string, unknown> | undefined)
      ?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined
    const captionTracks = captions?.captionTracks as Array<Record<string, unknown>> | undefined

    if (captionTracks && Array.isArray(captionTracks) && captionTracks.length > 0) {
      // Would need to fetch the actual caption track
      // This is a placeholder - full implementation would fetch and parse
    }
  } catch {
    // Continue
  }

  return segments
}

function findCaptionTrackUrl(): string | null {
  const scripts = Array.from(document.querySelectorAll("script"))
  for (const script of scripts) {
    const text = script.textContent || ""
    const match = text.match(/"captionTracks":\s*\[\s*\{[^}]*"baseUrl":\s*"([^"]+)"/)
    if (match && match[1]) {
      try {
        return decodeURIComponent(JSON.parse(`"${match[1]}"`))
      } catch {
        return match[1].replace(/\\u002F/g, "/").replace(/\\u0026/g, "&")
      }
    }
  }
  return null
}

async function fetchCaptionTrack(
  url: string
): Promise<Array<{ start: number; duration: number; text: string }>> {
  const segments: Array<{ start: number; duration: number; text: string }> = []

  try {
    const response = await fetch(url)
    const xml = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, "text/xml")

    const textNodes = Array.from(doc.querySelectorAll("text"))
    for (const node of textNodes) {
      const start = parseFloat(node.getAttribute("start") || "0")
      const duration = parseFloat(node.getAttribute("dur") || "0")
      const text = node.textContent?.trim() || ""
      if (text) {
        segments.push({ start, duration, text })
      }
    }
  } catch {
    // Continue
  }

  return segments
}

async function extractFromTranscriptPanel(): Promise<
  Array<{ start: number; duration: number; text: string }>
> {
  const segments: Array<{ start: number; duration: number; text: string }> = []

  // Try to click "more actions" then "show transcript"
  const moreActionsBtn = document.querySelector(
    'button[aria-label="More actions"], ytd-menu-renderer button'
  )
  if (moreActionsBtn instanceof HTMLElement) {
    // This is complex and may not work reliably
    // For now, return empty - full implementation would need user simulation
  }

  // Try to find existing transcript panel
  const transcriptItems = Array.from(
    document.querySelectorAll('ytd-transcript-segment-renderer, .ytd-transcript-segment-renderer')
  )

  for (const item of transcriptItems) {
    const timeEl = item.querySelector(".timestamp, [class*='time']")
    const textEl = item.querySelector(".segment-text, [class*='text']")

    if (timeEl && textEl) {
      const timeText = timeEl.textContent?.trim() || ""
      const text = textEl.textContent?.trim() || ""
      const start = parseTimeToSeconds(timeText)

      segments.push({ start, duration: 0, text })
    }
  }

  return segments
}

function parseTimeToSeconds(time: string): number {
  const parts = time.split(":").map(Number)
  if (parts.length === 2) {
    return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
  }
  if (parts.length === 3) {
    return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
  }
  return 0
}

function extractVideoInfo(): YouTubeVideoInfoResult | null {
  const title =
    document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string, h1.title')?.textContent?.trim() ||
    document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    ""

  const channel =
    document.querySelector('ytd-channel-name a, .ytd-channel-name a')?.textContent?.trim() ||
    document.querySelector('link[itemprop="author"]')?.getAttribute("name") ||
    ""

  const description =
    document.querySelector('#description, #description-inline-expander')?.textContent?.trim() ||
    document.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
    ""

  const durationMeta = document.querySelector('meta[itemprop="duration"]')?.getAttribute("content")
  const duration = durationMeta ? parseISO8601Duration(durationMeta) : 0

  const viewsText =
    document.querySelector('.view-count, .ytd-watch-metadata view-count')?.textContent || ""
  const viewsMatch = viewsText.match(/[\d,]+/)
  const views = viewsMatch ? parseInt(viewsMatch[0].replace(/,/g, ""), 10) : undefined

  const uploadDate =
    document.querySelector('meta[itemprop="datePublished"]')?.getAttribute("content") ||
    document.querySelector('.ytd-watch-metadata .date')?.textContent?.trim() ||
    undefined

  return {
    title,
    channel,
    description,
    duration,
    views,
    uploadDate,
  }
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || "0", 10)
  const minutes = parseInt(match[2] || "0", 10)
  const seconds = parseInt(match[3] || "0", 10)
  return hours * 3600 + minutes * 60 + seconds
}