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

const IGNORE_TAGS = new Set(["script", "style", "noscript", "iframe", "svg", "template"])
const BLOCK_TAGS = new Set([
  "p", "div", "section", "article", "main", "header", "footer", "aside", "nav",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote", "pre", "table", "tr", "td", "th",
  "form", "address", "figure", "figcaption",
])

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
      content = await extractAsMarkdown(root)
    } else {
      content = extractTextOptimized(root)
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

// ── Markdown extraction with frontmatter ─────────────────────────────────────────

async function extractAsMarkdown(root: Element | Document): Promise<string> {
  const rootEl = root instanceof Document ? document.body : root

  const frontmatterPromise = pageGetMetadata()
  const walker = document.createTreeWalker(
    rootEl,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node: Node): number => {
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT

        const tag = parent.tagName.toLowerCase()
        if (IGNORE_TAGS.has(tag)) return NodeFilter.FILTER_REJECT
        if (parent.hidden || parent.getAttribute("aria-hidden") === "true") return NodeFilter.FILTER_REJECT
        if (parent.textContent?.trim() === "") return NodeFilter.FILTER_REJECT

        return NodeFilter.FILTER_ACCEPT
      },
    }
  )

  const lines: string[] = []
  let currentBlock: string[] = []
  let lastTag = ""
  let inList = false
  let node: Node | null

  const flushBlock = () => {
    if (currentBlock.length > 0) {
      lines.push(currentBlock.join(" ").trim(), "")
      currentBlock = []
    }
  }

  const flushList = () => {
    if (inList && currentBlock.length > 0) {
      lines.push(...currentBlock)
      lines.push("")
      currentBlock = []
    }
    inList = false
  }

  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim()
    if (!text) continue

    const parent = node.parentElement
    if (!parent) continue

    const tag = parent.tagName.toLowerCase()

    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      flushList()
      flushBlock()
      const level = parseInt(tag.slice(1))
      const prefix = "#".repeat(level)
      lines.push(`${prefix} ${text}`, "")
      lastTag = tag
      continue
    }

    if (tag === "nav") {
      flushBlock()
      if (lastTag !== "nav") {
        lines.push("[NAV]", "")
      }
      const navLines = extractNavHierarchy(parent)
      if (navLines.length > 0) {
        lines.push(...navLines, "")
      }
      lastTag = "nav"
      continue
    }

    if (tag === "footer") {
      flushList()
      flushBlock()
      if (lastTag !== "footer") {
        lines.push("---", "", "[FOOTER]", "")
      }
      const footerText = parent.textContent?.trim().slice(0, 200)
      if (footerText) {
        lines.push(footerText, "")
      }
      lastTag = "footer"
      continue
    }

    if (tag === "a" && parent instanceof HTMLAnchorElement && parent.href) {
      const href = parent.getAttribute("href") || ""
      const cleaned = cleanText(text)
      if (href.startsWith("http")) {
        currentBlock.push(`[${cleaned}](${href})`)
      } else {
        currentBlock.push(cleaned)
      }
      continue
    }

    if (tag === "li") {
      if (!inList) {
        inList = true
        currentBlock = []
      }
      const liText = text.replace(/\n/g, " ").trim()
      currentBlock.push(`- ${liText}`)
      continue
    }

    if (tag === "ul" || tag === "ol") {
      continue
    }

    if (tag === "code" || tag === "pre") {
      flushBlock()
      const codeText = parent.textContent?.trim() || ""
      if (tag === "pre") {
        lines.push("```", codeText, "```", "")
      } else {
        lines.push(`\`${codeText}\``)
      }
      lastTag = tag
      continue
    }

    if (tag === "blockquote") {
      flushBlock()
      const quoteText = text.replace(/\n/g, " ").trim()
      lines.push(`> ${quoteText}`, "")
      lastTag = tag
      continue
    }

    if (tag === "strong" || tag === "b") {
      currentBlock.push(`**${text}**`)
      continue
    }

    if (tag === "em" || tag === "i") {
      currentBlock.push(`*${text}*`)
      continue
    }

    if (BLOCK_TAGS.has(tag)) {
      if (inList) flushList()
      if (tag !== lastTag) flushBlock()
      currentBlock.push(cleanText(text))
      lastTag = tag
      continue
    }

    const inlineText = cleanText(text)
    if (inlineText) {
      currentBlock.push(inlineText)
    }
  }

  flushList()
  flushBlock()

  const metadata = await frontmatterPromise
  const frontmatter = buildFrontmatter(metadata.success ? metadata.data ?? null : null)

  let body = lines.join("\n").trim()
  body = body.replace(/\n{3,}/g, "\n\n").replace(/^\n+|\n+$/g, "")

  return frontmatter + (frontmatter && body ? "\n\n" : "") + body
}

function extractLinksFromElement(el: Element): string {
  const links: string[] = []
  el.querySelectorAll("a").forEach((a) => {
    const text = a.textContent?.trim()
    const href = a.getAttribute("href")
    if (text && href) {
      if (href.startsWith("http")) {
        links.push(`[${text}](${href})`)
      } else if (href.startsWith("/") || href.startsWith("#")) {
        links.push(text)
      }
    }
  })
  return links.join(" | ")
}

function extractNavHierarchy(el: Element): string[] {
  const lines: string[] = []
  const items = el.querySelectorAll(":scope > li, :scope > a")

  items.forEach((item) => {
    if (item instanceof HTMLAnchorElement && item.href) {
      const text = item.textContent?.trim() || ""
      const href = item.getAttribute("href") || ""
      if (href.startsWith("http")) {
        lines.push(`- [${text}](${href})`)
      } else {
        lines.push(`- ${text}`)
      }
    } else if (item.tagName.toLowerCase() === "li") {
      const text = item.textContent?.trim().replace(/\s+/g, " ") || ""
      const firstLink = item.querySelector("a")
      if (firstLink) {
        const linkText = firstLink.textContent?.trim() || ""
        const href = firstLink.getAttribute("href") || ""
        if (href.startsWith("http")) {
          lines.push(`- [${linkText}](${href})`)
        } else {
          lines.push(`- ${linkText}`)
        }
      } else {
        lines.push(`- ${text}`)
      }

      const subItems = item.querySelectorAll(":scope > ul > li, :scope > ol > li")
      subItems.forEach((subItem) => {
        const subText = subItem.textContent?.trim().replace(/\s+/g, " ") || ""
        const subLink = subItem.querySelector("a")
        if (subLink) {
          const linkText = subLink.textContent?.trim() || ""
          const href = subLink.getAttribute("href") || ""
          if (href.startsWith("http")) {
            lines.push(`  - [${linkText}](${href})`)
          } else {
            lines.push(`  - ${linkText}`)
          }
        } else {
          lines.push(`  - ${subText}`)
        }
      })
    }
  })

  return lines
}

function buildFrontmatter(meta: PageGetMetadataResult | null): string {
  if (!meta) return ""

  const parts: string[] = []

  if (meta.title) {
    parts.push(`title: "${meta.title.replace(/"/g, '\\"')}"`)
  }

  if (meta.url) {
    parts.push(`url: "${meta.url}"`)
  }

  if (meta.openGraph) {
    if (meta.openGraph.title) {
      parts.push(`og_title: "${meta.openGraph.title.replace(/"/g, '\\"')}"`)
    }
    if (meta.openGraph.description) {
      parts.push(`og_description: "${meta.openGraph.description.replace(/"/g, '\\"')}"`)
    }
    if (meta.openGraph.image) {
      parts.push(`og_image: "${meta.openGraph.image}"`)
    }
  }

  if (meta.metaTags.description) {
    parts.push(`description: "${meta.metaTags.description.replace(/"/g, '\\"')}"`)
  }

  if (parts.length === 0) return ""

  return `---\n${parts.join("\n")}\n---`
}

// ── Optimized text extraction with TreeWalker ───────────────────────────────────

function extractTextOptimized(root: Element | Document): string {
  const walker = document.createTreeWalker(
    root instanceof Document ? document.body : root,
    NodeFilter.SHOW_TEXT,
    null
  )

  const parts: string[] = []
  let node: Node | null

  while ((node = walker.nextNode())) {
    let parent = node.parentElement
    if (!parent) continue

    while (parent && parent !== root && !(parent instanceof Document)) {
      if (IGNORE_TAGS.has(parent.tagName.toLowerCase())) {
        parent = null
        break
      }
      if (parent.hidden || parent.getAttribute("aria-hidden") === "true") {
        parent = null
        break
      }
      parent = parent.parentElement
    }
    if (!parent || parent === root || parent instanceof Document) continue

    const tag = parent.tagName.toLowerCase()
    const text = node.textContent?.trim()
    if (!text) continue

    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      const level = parseInt(tag.slice(1))
      const prefix = "#".repeat(level)
      parts.push("", prefix + " " + text)
      continue
    }

    if (tag === "nav") {
      parts.push("", "[NAV] " + text.slice(0, 100))
      continue
    }

    if (tag === "footer") {
      parts.push("", "[FOOTER] " + text.slice(0, 100))
      continue
    }

    parts.push(text.replace(/\s+/g, " "))
  }

  return parts.join(" ").replace(/\s{2,}/g, " ").trim()
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim()
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