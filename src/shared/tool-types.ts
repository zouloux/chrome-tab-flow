// Tool parameter and result types for TabFlow

import type { JSONSchema } from "./types"

// ── Tool Result ────────────────────────────────────────────────────────────────

export interface ToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// ── Page Reading Tools ──────────────────────────────────────────────────────────

export interface PageGetContentParams {
  format?: "text" | "html" | "markdown"
  selector?: string
  maxLength?: number
}

export interface PageGetContentResult {
  content: string
  format: "text" | "html" | "markdown"
  truncated: boolean
}

export interface PageGetMetadataResult {
  title: string
  url: string
  metaTags: Record<string, string>
  openGraph: Record<string, string>
}

export interface PageQuerySelectorParams {
  selector: string
  limit?: number
}

export interface ElementInfo {
  tag: string
  text: string
  attributes: Record<string, string>
}

export interface PageQuerySelectorResult {
  elements: ElementInfo[]
  count: number
}

export interface PageGetElementInfoParams {
  selector: string
}

export interface PageGetElementInfoResult {
  tag: string
  text: string
  attributes: Record<string, string>
  styles: Record<string, string>
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

// ── Page Interaction Tools ──────────────────────────────────────────────────────

export interface PageClickParams {
  selector: string
}

export interface PageFillParams {
  selector: string
  value: string
}

export interface PageSelectParams {
  selector: string
  value: string
}

export interface PageScrollParams {
  direction: "up" | "down" | "left" | "right"
  amount?: number
  selector?: string
}

export interface PageNavigateParams {
  url: string
}

export interface PageWaitParams {
  selector?: string
  timeout?: number
}

export interface PageActionResult {
  success: boolean
  message?: string
}

// ── DOM Manipulation Tools ──────────────────────────────────────────────────────

export interface DomModifyAttributeParams {
  selector: string
  attribute: string
  value: string | null
}

export interface DomModifyStyleParams {
  selector: string
  styles: Record<string, string>
}

export interface DomModifyClassParams {
  selector: string
  action: "add" | "remove" | "toggle"
  classes: string[]
}

export interface DomInsertHtmlParams {
  selector: string
  position: "beforebegin" | "afterbegin" | "beforeend" | "afterend"
  html: string
}

export interface DomRemoveParams {
  selector: string
}

export interface DomActionResult {
  success: boolean
  message?: string
}

// ── Screenshot Tool ────────────────────────────────────────────────────────────

export interface PageScreenshotParams {
  selector?: string
  fullPage?: boolean
}

export interface PageScreenshotResult {
  data: string
  mimeType: "image/png"
  width: number
  height: number
}

// ── YouTube Tools ──────────────────────────────────────────────────────────────

export interface YouTubeTranscriptResult {
  segments: Array<{
    start: number
    duration: number
    text: string
  }>
  fullText: string
}

export interface YouTubeVideoInfoResult {
  title: string
  channel: string
  description: string
  duration: number
  views?: number
  uploadDate?: string
}

// ── Tool Definition Type ──────────────────────────────────────────────────────

export interface ToolDefinition<TParams = unknown, TResult = unknown> {
  name: string
  description: string
  parameters: JSONSchema
  execute: (params: TParams, tabId: number) => Promise<ToolResult<TResult>>
}

// ── Tool Category ─────────────────────────────────────────────────────────────

export type ToolCategory =
  | "page-reading"
  | "page-interaction"
  | "dom-manipulation"
  | "visual"
  | "youtube"
  | "tab-management"

export interface ToolInfo {
  name: string
  description: string
  category: ToolCategory
  parameters: JSONSchema
}