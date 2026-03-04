// Page reading tools - content script implementations

import type {
  PageGetContentParams,
  PageGetContentResult,
  PageGetMetadataResult,
  PageQuerySelectorParams,
  PageQuerySelectorResult,
  ElementInfo,
  PageGetElementInfoParams,
  PageGetElementInfoResult,
  ToolResult,
} from "../../shared/tool-types"

// ── page_get_content ────────────────────────────────────────────────────────────

export async function pageGetContent(
  params: PageGetContentParams
): Promise<ToolResult<PageGetContentResult>> {
  try {
    const { format = "text", selector, maxLength = 50000 } = params

    let root: Element | Document = document
    if (selector) {
      const el = document.querySelector(selector)
      if (!el) {
        return { success: false, error: `Element not found: ${selector}` }
      }
      root = el
    }

    let content: string
    let truncated = false

    if (format === "html") {
      content = root instanceof Document ? document.body.innerHTML : root.innerHTML
    } else if (format === "markdown") {
      const html = root instanceof Document ? document.body.innerHTML : root.innerHTML
      content = htmlToMarkdown(html)
    } else {
      content = extractTextContent(root)
    }

    if (content.length > maxLength) {
      content = content.slice(0, maxLength)
      truncated = true
    }

    return {
      success: true,
      data: { content, format, truncated },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── page_get_metadata ───────────────────────────────────────────────────────────

export async function pageGetMetadata(): Promise<ToolResult<PageGetMetadataResult>> {
  try {
    const metaTags: Record<string, string> = {}
    const openGraph: Record<string, string> = {}

    document.querySelectorAll("meta").forEach((meta) => {
      const name = meta.getAttribute("name") || meta.getAttribute("property")
      const content = meta.getAttribute("content")
      if (name && content) {
        if (name.startsWith("og:")) {
          openGraph[name.slice(3)] = content
        } else {
          metaTags[name] = content
        }
      }
    })

    return {
      success: true,
      data: {
        title: document.title,
        url: location.href,
        metaTags,
        openGraph,
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── page_query_selector ─────────────────────────────────────────────────────────

export async function pageQuerySelector(
  params: PageQuerySelectorParams
): Promise<ToolResult<PageQuerySelectorResult>> {
  try {
    const { selector, limit = 50 } = params

    const elements = Array.from(document.querySelectorAll(selector)).slice(0, limit)

    const elementInfos: ElementInfo[] = elements.map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: el.textContent?.trim().slice(0, 500) ?? "",
      attributes: getElementAttributes(el),
    }))

    return {
      success: true,
      data: {
        elements: elementInfos,
        count: elementInfos.length,
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── page_get_element_info ───────────────────────────────────────────────────────

export async function pageGetElementInfo(
  params: PageGetElementInfoParams
): Promise<ToolResult<PageGetElementInfoResult>> {
  try {
    const { selector } = params

    const el = document.querySelector(selector)
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    const bounds = el.getBoundingClientRect()

    return {
      success: true,
      data: {
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim() ?? "",
        attributes: getElementAttributes(el),
        styles: getComputedStyles(el),
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractTextContent(root: Element | Document): string {
  const clone = root instanceof Document ? document.body.cloneNode(true) : root.cloneNode(true)

  const removeSelectors = [
    "script",
    "style",
    "noscript",
    "iframe",
    "svg",
    "[hidden]",
    "[aria-hidden='true']",
  ]

  removeSelectors.forEach((sel) => {
    ;(clone as Element).querySelectorAll(sel).forEach((el) => el.remove())
  })

  return clone.textContent?.replace(/\s+/g, " ").trim() ?? ""
}

function htmlToMarkdown(html: string): string {
  let md = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n#### $1\n")
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, "\n##### $1\n")
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, "\n###### $1\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "\n$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, "\n```\n$1\n```\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  return md
}

function getElementAttributes(el: Element): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const attr of Array.from(el.attributes)) {
    attrs[attr.name] = attr.value
  }
  return attrs
}

function getComputedStyles(el: Element): Record<string, string> {
  const styles = window.getComputedStyle(el)
  const relevantProps = [
    "display",
    "visibility",
    "position",
    "width",
    "height",
    "margin",
    "padding",
    "background-color",
    "color",
    "font-size",
    "font-family",
    "border",
  ]
  const result: Record<string, string> = {}
  for (const prop of relevantProps) {
    result[prop] = styles.getPropertyValue(prop)
  }
  return result
}