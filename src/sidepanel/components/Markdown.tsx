// Simple markdown renderer - no dependencies, handles common syntax

import { type ReactNode } from "react"

// ── Inline Parser ─────────────────────────────────────────────────────────────

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let i = 0
  let buf = ""

  const flush = () => {
    if (buf) {
      nodes.push(buf)
      buf = ""
    }
  }

  while (i < text.length) {
    // Bold: **text**
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2)
      if (end !== -1) {
        flush()
        nodes.push(<strong key={i}>{parseInline(text.slice(i + 2, end))}</strong>)
        i = end + 2
        continue
      }
    }

    // Italic: *text* (but not **)
    if (text[i] === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1)
      if (end !== -1) {
        flush()
        nodes.push(<em key={i}>{parseInline(text.slice(i + 1, end))}</em>)
        i = end + 1
        continue
      }
    }

    // Inline code: `code`
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1)
      if (end !== -1) {
        flush()
        nodes.push(<code key={i}>{text.slice(i + 1, end)}</code>)
        i = end + 1
        continue
      }
    }

    // Link: [text](url)
    if (text[i] === "[") {
      const bracketEnd = text.indexOf("]", i + 1)
      if (bracketEnd !== -1 && text[bracketEnd + 1] === "(") {
        const parenEnd = text.indexOf(")", bracketEnd + 2)
        if (parenEnd !== -1) {
          flush()
          const linkText = text.slice(i + 1, bracketEnd)
          const url = text.slice(bracketEnd + 2, parenEnd)
          nodes.push(
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              {linkText}
            </a>
          )
          i = parenEnd + 1
          continue
        }
      }
    }

    buf += text[i]
    i++
  }

  flush()
  return nodes
}

// ── Block Parser ──────────────────────────────────────────────────────────────

// A line-safe accessor that ensures we always get a string
function getLine(lines: string[], idx: number): string {
  return lines[idx] ?? ""
}

function isSpecialLine(line: string): boolean {
  return (
    line.startsWith("#") ||
    line.startsWith("> ") ||
    /^[-*+]\s/.test(line) ||
    /^\d+\.\s/.test(line) ||
    line.trimStart().startsWith("```") ||
    /^[-*]{3,}$/.test(line.trim()) ||
    line.trim() === ""
  )
}

function parseBlocks(markdown: string): ReactNode[] {
  const lines = markdown.split("\n")
  const nodes: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = getLine(lines, i)

    // Fenced code block: ```lang
    if (line.trimStart().startsWith("```")) {
      const lang = line.trimStart().slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !getLine(lines, i).trimStart().startsWith("```")) {
        codeLines.push(getLine(lines, i))
        i++
      }
      i++ // skip closing ```
      nodes.push(
        <pre key={`code-${i}`}>
          <code className={lang ? `language-${lang}` : ""}>{codeLines.join("\n")}</code>
        </pre>
      )
      continue
    }

    // Headings: # H1, ## H2, ### H3
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 1
      const content = parseInline(headingMatch[2] ?? "")
      if (level === 1) nodes.push(<h1 key={`h-${i}`}>{content}</h1>)
      else if (level === 2) nodes.push(<h2 key={`h-${i}`}>{content}</h2>)
      else nodes.push(<h3 key={`h-${i}`}>{content}</h3>)
      i++
      continue
    }

    // Horizontal rule: --- or ***
    if (/^[-*]{3,}$/.test(line.trim())) {
      nodes.push(<hr key={`hr-${i}`} />)
      i++
      continue
    }

    // Blockquote: > text
    if (line.startsWith("> ")) {
      const quoteLines: string[] = []
      while (i < lines.length && getLine(lines, i).startsWith("> ")) {
        quoteLines.push(getLine(lines, i).slice(2))
        i++
      }
      nodes.push(
        <blockquote key={`bq-${i}`}>
          {parseBlocks(quoteLines.join("\n"))}
        </blockquote>
      )
      continue
    }

    // Unordered list: - item or * item
    if (/^[-*+]\s/.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^[-*+]\s/.test(getLine(lines, i))) {
        const itemLine = getLine(lines, i)
        items.push(
          <li key={`li-${i}`}>{parseInline(itemLine.slice(2))}</li>
        )
        i++
      }
      nodes.push(<ul key={`ul-${i}`}>{items}</ul>)
      continue
    }

    // Ordered list: 1. item
    if (/^\d+\.\s/.test(line)) {
      const items: ReactNode[] = []
      while (i < lines.length && /^\d+\.\s/.test(getLine(lines, i))) {
        const itemLine = getLine(lines, i)
        const text = itemLine.replace(/^\d+\.\s/, "")
        items.push(
          <li key={`oli-${i}`}>{parseInline(text)}</li>
        )
        i++
      }
      nodes.push(<ol key={`ol-${i}`}>{items}</ol>)
      continue
    }

    // Blank line - skip
    if (line.trim() === "") {
      i++
      continue
    }

    // Paragraph: collect consecutive non-blank, non-special lines
    const paraLines: string[] = []
    while (i < lines.length && !isSpecialLine(getLine(lines, i))) {
      paraLines.push(getLine(lines, i))
      i++
    }

    if (paraLines.length > 0) {
      const combined = paraLines.join(" ")
      nodes.push(<p key={`p-${i}`}>{parseInline(combined)}</p>)
    }
  }

  return nodes
}

// ── Component ─────────────────────────────────────────────────────────────────

interface MarkdownProps {
  children: string
  className?: string
}

export function Markdown({ children, className = "" }: MarkdownProps) {
  const blocks = parseBlocks(children)
  return (
    <div className={`markdown-content ${className}`}>
      {blocks}
    </div>
  )
}
