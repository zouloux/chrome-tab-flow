# Phase 4: Tool System

## Goal
Define all tools the LLM can call and build the execution pipeline. This is the "MCP-like" layer.

## Tool Definitions

### Page Reading
| Tool | Description | Parameters |
|------|-------------|------------|
| `page_get_content` | Get cleaned page text content (or HTML subset) | `{ format: "text" \| "html" \| "markdown", selector?: string, maxLength?: number }` |
| `page_get_metadata` | Get page title, URL, meta tags, OpenGraph data | `{}` |
| `page_query_selector` | Query elements matching a CSS selector, return their text/attributes | `{ selector: string, limit?: number }` |
| `page_get_element_info` | Get detailed info about a specific element | `{ selector: string }` returns tag, text, attributes, computed styles, bounding rect |

### Page Interaction
| Tool | Description | Parameters |
|------|-------------|------------|
| `page_click` | Click an element | `{ selector: string }` |
| `page_fill` | Fill an input or textarea | `{ selector: string, value: string }` |
| `page_select` | Select an option in a <select> | `{ selector: string, value: string }` |
| `page_scroll` | Scroll page or element | `{ direction: "up"\|"down"\|"left"\|"right", amount?: number, selector?: string }` |
| `page_navigate` | Navigate to a URL | `{ url: string }` |
| `page_wait` | Wait for an element to appear or a timeout | `{ selector?: string, timeout?: number }` |

### DOM Manipulation
| Tool | Description | Parameters |
|------|-------------|------------|
| `dom_modify_attribute` | Set/remove an attribute on an element | `{ selector: string, attribute: string, value: string \| null }` |
| `dom_modify_style` | Modify inline styles | `{ selector: string, styles: Record<string, string> }` |
| `dom_modify_class` | Add/remove/toggle CSS classes | `{ selector: string, action: "add"\|"remove"\|"toggle", classes: string[] }` |
| `dom_insert_html` | Insert HTML adjacent to an element | `{ selector: string, position: "beforebegin"\|"afterbegin"\|"beforeend"\|"afterend", html: string }` |
| `dom_remove` | Remove an element from the DOM | `{ selector: string }` |

### Visual
| Tool | Description | Parameters |
|------|-------------|------------|
| `page_screenshot` | Capture visible viewport or element screenshot | `{ selector?: string, fullPage?: boolean }` returns base64 image |

### YouTube-Specific
| Tool | Description | Parameters |
|------|-------------|------------|
| `youtube_get_transcript` | Extract video transcript/captions | `{}` returns timestamped transcript text |
| `youtube_get_video_info` | Get video title, channel, description, duration | `{}` |

## Execution Architecture

### Tool Registry (`src/shared/tools.ts`)
```ts
interface Tool {
  name: string
  description: string
  parameters: JSONSchema
  execute: (params: Record<string, unknown>, tabId: number) => Promise<ToolResult>
}

interface ToolResult {
  success: boolean
  data: unknown
  error?: string
}
```

### Execution Flow
1. Background receives tool calls from LLM stream
2. For each tool call:
   - Look up tool in registry
   - If tool needs content script: send message to content script, await response
   - If tool is background-only (e.g., `page_navigate`): execute directly via `chrome.tabs` API
3. Collect all results
4. Format as tool results for the LLM provider
5. Continue the LLM conversation

### Tool Result Formatting
Results are formatted differently per provider:
- **Anthropic**: `{ type: "tool_result", tool_use_id, content: [...] }`
- **OpenAI**: `{ role: "tool", tool_call_id, content: "..." }`
- **Gemini**: `{ functionResponse: { name, response } }`

This normalization happens in `llms.ts`.

## Files to Create
- `src/shared/tools.ts` - Tool registry, definitions, JSON schemas
- `src/shared/tool-types.ts` - Tool parameter/result types
- `src/content/tools/` - Content script tool implementations
  - `page-reader.ts` - getContent, getMetadata, querySelector, getElementInfo
  - `page-actions.ts` - click, fill, select, scroll
  - `dom-manipulator.ts` - modifyAttribute, modifyStyle, modifyClass, insertHtml, remove
  - `screenshot.ts` - viewport/element capture
  - `youtube.ts` - transcript extraction

## Acceptance
- All tools have JSON Schema definitions that validate
- Content script tools execute and return results
- Background correctly routes tool execution
- Tool results format correctly for all 3 LLM providers
