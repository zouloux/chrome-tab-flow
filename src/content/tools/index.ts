// Content script tools index - exports all tool implementations

export * from "./page-reader"
export * from "./page-actions"
export * from "./dom-manipulator"
export * from "./screenshot"
export * from "./youtube"

import type { ToolResult } from "../../shared/tool-types"
import type { JSONSchema } from "../../shared/types"

// Re-export tool parameter types for convenience
export type {
  PageGetContentParams,
  PageGetContentResult,
  PageGetMetadataResult,
  PageQuerySelectorParams,
  PageQuerySelectorResult,
  PageGetElementInfoParams,
  PageGetElementInfoResult,
  PageClickParams,
  PageFillParams,
  PageSelectParams,
  PageScrollParams,
  PageNavigateParams,
  PageWaitParams,
  PageActionResult,
  PageScreenshotParams,
  PageScreenshotResult,
  DomModifyAttributeParams,
  DomModifyStyleParams,
  DomModifyClassParams,
  DomInsertHtmlParams,
  DomRemoveParams,
  DomActionResult,
  YouTubeTranscriptResult,
  YouTubeVideoInfoResult,
} from "../../shared/tool-types"

// ── Tool execution map ───────────────────────────────────────────────────────────

import {
  pageGetContent,
  pageGetMetadata,
  pageQuerySelector,
  pageGetElementInfo,
} from "./page-reader"
import { pageClick, pageFill, pageSelect, pageScroll, pageWait } from "./page-actions"
import {
  domModifyAttribute,
  domModifyStyle,
  domModifyClass,
  domInsertHtml,
  domRemove,
} from "./dom-manipulator"
import { pageScreenshotPrep } from "./screenshot"
import { youtubeGetTranscript, youtubeGetVideoInfo } from "./youtube"

export type ToolHandler<T = unknown> = (params: T) => Promise<ToolResult<unknown>>

export const contentTools: Record<string, ToolHandler<unknown>> = {
  page_get_content: pageGetContent as ToolHandler<unknown>,
  page_get_metadata: pageGetMetadata as ToolHandler<unknown>,
  page_query_selector: pageQuerySelector as ToolHandler<unknown>,
  page_get_element_info: pageGetElementInfo as ToolHandler<unknown>,
  page_click: pageClick as ToolHandler<unknown>,
  page_fill: pageFill as ToolHandler<unknown>,
  page_select: pageSelect as ToolHandler<unknown>,
  page_scroll: pageScroll as ToolHandler<unknown>,
  page_wait: pageWait as ToolHandler<unknown>,
  dom_modify_attribute: domModifyAttribute as ToolHandler<unknown>,
  dom_modify_style: domModifyStyle as ToolHandler<unknown>,
  dom_modify_class: domModifyClass as ToolHandler<unknown>,
  dom_insert_html: domInsertHtml as ToolHandler<unknown>,
  dom_remove: domRemove as ToolHandler<unknown>,
  page_screenshot_prep: pageScreenshotPrep as ToolHandler<unknown>,
  youtube_get_transcript: youtubeGetTranscript as ToolHandler<unknown>,
  youtube_get_video_info: youtubeGetVideoInfo as ToolHandler<unknown>,
}

export async function executeTool(
  name: string,
  params: unknown
): Promise<ToolResult<unknown>> {
  const handler = contentTools[name]
  if (!handler) {
    return { success: false, error: `Unknown tool: ${name}` }
  }
  return handler(params)
}