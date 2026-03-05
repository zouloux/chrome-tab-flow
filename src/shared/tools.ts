// Tool registry, definitions, and JSON schemas for TabFlow

import type { JSONSchema } from "./types"
import type { ToolInfo, ToolCategory } from "./tool-types"

// ── JSON Schema helpers ───────────────────────────────────────────────────────

const stringSchema = (description?: string): JSONSchema => ({
  type: "string",
  ...(description ? { description } : {}),
})

const numberSchema = (description?: string): JSONSchema => ({
  type: "number",
  ...(description ? { description } : {}),
})

const booleanSchema = (description?: string): JSONSchema => ({
  type: "boolean",
  ...(description ? { description } : {}),
})

const objectSchema = (
  properties: Record<string, JSONSchema>,
  required?: string[],
  description?: string
): JSONSchema => ({
  type: "object",
  properties,
  ...(required ? { required } : {}),
  ...(description ? { description } : {}),
})

const arraySchema = (items: JSONSchema, description?: string): JSONSchema => ({
  type: "array",
  items,
  ...(description ? { description } : {}),
})

const enumSchema = <T extends string>(values: T[], description?: string): JSONSchema => ({
  type: "string",
  enum: values,
  ...(description ? { description } : {}),
})

// Helper to add tabId parameter to tool schemas
const addTabIdParam = (schema: JSONSchema): JSONSchema => {
  const props = { ...(schema.properties || {}) }
  props.tabId = numberSchema("Optional tab ID to execute this tool on. If not provided, uses the first associated tab.")
  return {
    ...schema,
    properties: props,
  }
}

// ── Tool JSON Schemas ──────────────────────────────────────────────────────────

export const toolSchemas = {
  // Page Reading
  page_get_content: addTabIdParam(objectSchema(
    {
      format: enumSchema(["text", "html", "markdown"], "Output format for the content"),
      selector: stringSchema("Optional CSS selector to scope content extraction"),
      maxLength: numberSchema("Maximum characters to return"),
    },
    undefined,
    "Get cleaned page text content (or HTML subset)"
  )),

  page_get_metadata: addTabIdParam(objectSchema(
    {},
    [],
    "Get page title, URL, meta tags, and OpenGraph data"
  )),

  page_query_selector: addTabIdParam(objectSchema(
    {
      selector: stringSchema("CSS selector to query"),
      limit: numberSchema("Maximum number of elements to return"),
    },
    ["selector"],
    "Query elements matching a CSS selector, return their text/attributes"
  )),

  page_get_element_info: addTabIdParam(objectSchema(
    {
      selector: stringSchema("CSS selector for the target element"),
    },
    ["selector"],
    "Get detailed info about a specific element"
  )),

  // Page Interaction
  page_click: addTabIdParam(objectSchema(
    {
      selector: stringSchema("CSS selector for the element to click"),
    },
    ["selector"],
    "Click an element"
  )),

  page_fill: addTabIdParam(objectSchema(
    {
      selector: stringSchema("CSS selector for the input/textarea"),
      value: stringSchema("Value to fill"),
    },
    ["selector", "value"],
    "Fill an input or textarea"
  )),

  page_select: addTabIdParam(objectSchema(
    {
      selector: stringSchema("CSS selector for the <select> element"),
      value: stringSchema("Value of the option to select"),
    },
    ["selector", "value"],
    "Select an option in a <select>"
  )),

  page_scroll: addTabIdParam(objectSchema(
    {
      direction: enumSchema(["up", "down", "left", "right"], "Scroll direction"),
      amount: numberSchema("Pixels to scroll (default: viewport size)"),
      selector: stringSchema("Optional selector to scroll within a specific element"),
    },
    ["direction"],
    "Scroll page or element"
  )),

  page_navigate: addTabIdParam(objectSchema(
    {
      url: stringSchema("URL to navigate to"),
    },
    ["url"],
    "Navigate to a URL"
  )),

  page_wait: addTabIdParam(objectSchema(
    {
      selector: stringSchema("CSS selector to wait for"),
      timeout: numberSchema("Maximum wait time in milliseconds"),
    },
    [],
    "Wait for an element to appear or a timeout"
  )),

  // DOM Manipulation
  dom_modify_attribute: addTabIdParam(objectSchema(
    {
      selector: stringSchema("CSS selector for the target element"),
      attribute: stringSchema("Attribute name to set or remove"),
      value: stringSchema("Value to set, or null to remove the attribute"),
    },
    ["selector", "attribute"],
    "Set/remove an attribute on an element"
  )),

  dom_modify_style: addTabIdParam(objectSchema(
    {
      selector: stringSchema("CSS selector for the target element"),
      styles: objectSchema(
        {},
        [],
        "CSS properties and values to apply"
      ),
    },
    ["selector", "styles"],
    "Modify inline styles"
  )),

  dom_modify_class: addTabIdParam(objectSchema(
    {
      selector: stringSchema("CSS selector for the target element"),
      action: enumSchema(["add", "remove", "toggle"], "Class manipulation action"),
      classes: arraySchema(stringSchema(), "Class names to add/remove/toggle"),
    },
    ["selector", "action", "classes"],
    "Add/remove/toggle CSS classes"
  )),

  dom_insert_html: addTabIdParam(objectSchema(
    {
      selector: stringSchema("CSS selector for the reference element"),
      position: enumSchema(
        ["beforebegin", "afterbegin", "beforeend", "afterend"],
        "Position relative to the element"
      ),
      html: stringSchema("HTML string to insert"),
    },
    ["selector", "position", "html"],
    "Insert HTML adjacent to an element"
  )),

  dom_remove: addTabIdParam(objectSchema(
    {
      selector: stringSchema("CSS selector for the element to remove"),
    },
    ["selector"],
    "Remove an element from the DOM"
  )),

  // Visual
  page_screenshot: addTabIdParam(objectSchema(
    {
      selector: stringSchema("Optional CSS selector to capture a specific element"),
      fullPage: booleanSchema("Capture the full scrollable page"),
    },
    [],
    "Capture visible viewport or element screenshot"
  )),

  // YouTube
  youtube_get_transcript: addTabIdParam(objectSchema(
    {},
    [],
    "Extract video transcript/captions"
  )),

  youtube_get_video_info: addTabIdParam(objectSchema(
    {},
    [],
    "Get video title, channel, description, duration"
  )),

  // Tab Management
  tab_switch: objectSchema(
    {
      tabId: numberSchema("ID of the tab to switch to"),
    },
    ["tabId"],
    "Switch to a different tab. Only works with tabs associated with this conversation."
  ),
} as const

// ── Tool Definitions (info only, execution handled separately) ────────────────

export const toolDefinitions: ToolInfo[] = [
  // Page Reading
  {
    name: "page_get_content",
    description: "Get cleaned page text content (or HTML subset)",
    category: "page-reading",
    parameters: toolSchemas.page_get_content,
  },
  {
    name: "page_get_metadata",
    description: "Get page title, URL, meta tags, OpenGraph data",
    category: "page-reading",
    parameters: toolSchemas.page_get_metadata,
  },
  {
    name: "page_query_selector",
    description: "Query elements matching a CSS selector, return their text/attributes",
    category: "page-reading",
    parameters: toolSchemas.page_query_selector,
  },
  {
    name: "page_get_element_info",
    description: "Get detailed info about a specific element",
    category: "page-reading",
    parameters: toolSchemas.page_get_element_info,
  },

  // Page Interaction
  {
    name: "page_click",
    description: "Click an element",
    category: "page-interaction",
    parameters: toolSchemas.page_click,
  },
  {
    name: "page_fill",
    description: "Fill an input or textarea",
    category: "page-interaction",
    parameters: toolSchemas.page_fill,
  },
  {
    name: "page_select",
    description: "Select an option in a <select>",
    category: "page-interaction",
    parameters: toolSchemas.page_select,
  },
  {
    name: "page_scroll",
    description: "Scroll page or element",
    category: "page-interaction",
    parameters: toolSchemas.page_scroll,
  },
  {
    name: "page_navigate",
    description: "Navigate to a URL",
    category: "page-interaction",
    parameters: toolSchemas.page_navigate,
  },
  {
    name: "page_wait",
    description: "Wait for an element to appear or a timeout",
    category: "page-interaction",
    parameters: toolSchemas.page_wait,
  },

  // DOM Manipulation
  {
    name: "dom_modify_attribute",
    description: "Set/remove an attribute on an element",
    category: "dom-manipulation",
    parameters: toolSchemas.dom_modify_attribute,
  },
  {
    name: "dom_modify_style",
    description: "Modify inline styles",
    category: "dom-manipulation",
    parameters: toolSchemas.dom_modify_style,
  },
  {
    name: "dom_modify_class",
    description: "Add/remove/toggle CSS classes",
    category: "dom-manipulation",
    parameters: toolSchemas.dom_modify_class,
  },
  {
    name: "dom_insert_html",
    description: "Insert HTML adjacent to an element",
    category: "dom-manipulation",
    parameters: toolSchemas.dom_insert_html,
  },
  {
    name: "dom_remove",
    description: "Remove an element from the DOM",
    category: "dom-manipulation",
    parameters: toolSchemas.dom_remove,
  },

  // Visual
  // FIXME : Not working yet
  // {
  //   name: "page_screenshot",
  //   description: "Capture visible viewport or element screenshot",
  //   category: "visual",
  //   parameters: toolSchemas.page_screenshot,
  // },

  // YouTube
  {
    name: "youtube_get_transcript",
    description: "Extract video transcript/captions",
    category: "youtube",
    parameters: toolSchemas.youtube_get_transcript,
  },
  {
    name: "youtube_get_video_info",
    description: "Get video title, channel, description, duration",
    category: "youtube",
    parameters: toolSchemas.youtube_get_video_info,
  },

  // Tab Management
  {
    name: "tab_switch",
    description: "Switch to a different tab. Only works with tabs associated with this conversation.",
    category: "tab-management",
    parameters: toolSchemas.tab_switch,
  },
]

// ── Tool Registry for LLM API ─────────────────────────────────────────────────

import type { ToolDefinition } from "./types"

export function getToolsForLLM(): ToolDefinition[] {
  return toolDefinitions.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }))
}

// ── Tool Name Type ─────────────────────────────────────────────────────────────

export type ToolName = (typeof toolDefinitions)[number]["name"]

// ── Helper: Get tool categories ────────────────────────────────────────────────

export function getToolsByCategory(category: ToolCategory): ToolInfo[] {
  return toolDefinitions.filter((t) => t.category === category)
}

// ── Helper: Check if tool exists ───────────────────────────────────────────────

export function isValidTool(name: string): name is ToolName {
  return toolDefinitions.some((t) => t.name === name)
}

// ── Helper: Get tool info ──────────────────────────────────────────────────────

export function getToolInfo(name: ToolName): ToolInfo | undefined {
  return toolDefinitions.find((t) => t.name === name)
}
