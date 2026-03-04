// DOM manipulation tools - content script implementations

import type {
  DomModifyAttributeParams,
  DomModifyStyleParams,
  DomModifyClassParams,
  DomInsertHtmlParams,
  DomRemoveParams,
  DomActionResult,
  ToolResult,
} from "../../shared/tool-types"

// ── dom_modify_attribute ────────────────────────────────────────────────────────

export async function domModifyAttribute(
  params: DomModifyAttributeParams
): Promise<ToolResult<DomActionResult>> {
  try {
    const { selector, attribute, value } = params

    const el = document.querySelector(selector)
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    if (value === null) {
      el.removeAttribute(attribute)
      return {
        success: true,
        data: { success: true, message: `Removed attribute ${attribute}` },
      }
    }

    el.setAttribute(attribute, value)
    return {
      success: true,
      data: { success: true, message: `Set ${attribute}="${value}"` },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── dom_modify_style ────────────────────────────────────────────────────────────

export async function domModifyStyle(
  params: DomModifyStyleParams
): Promise<ToolResult<DomActionResult>> {
  try {
    const { selector, styles } = params

    const el = document.querySelector(selector)
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    if (!(el instanceof HTMLElement)) {
      return { success: false, error: `Element is not an HTMLElement: ${selector}` }
    }

    for (const [prop, value] of Object.entries(styles)) {
      el.style.setProperty(prop, value)
    }

    return {
      success: true,
      data: { success: true, message: `Applied ${Object.keys(styles).length} styles` },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── dom_modify_class ────────────────────────────────────────────────────────────

export async function domModifyClass(
  params: DomModifyClassParams
): Promise<ToolResult<DomActionResult>> {
  try {
    const { selector, action, classes } = params

    const el = document.querySelector(selector)
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    for (const cls of classes) {
      switch (action) {
        case "add":
          el.classList.add(cls)
          break
        case "remove":
          el.classList.remove(cls)
          break
        case "toggle":
          el.classList.toggle(cls)
          break
      }
    }

    return {
      success: true,
      data: { success: true, message: `${action} classes: ${classes.join(", ")}` },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── dom_insert_html ─────────────────────────────────────────────────────────────

export async function domInsertHtml(
  params: DomInsertHtmlParams
): Promise<ToolResult<DomActionResult>> {
  try {
    const { selector, position, html } = params

    const el = document.querySelector(selector)
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    el.insertAdjacentHTML(position, html)

    return {
      success: true,
      data: { success: true, message: `Inserted HTML at ${position}` },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── dom_remove ──────────────────────────────────────────────────────────────────

export async function domRemove(
  params: DomRemoveParams
): Promise<ToolResult<DomActionResult>> {
  try {
    const { selector } = params

    const el = document.querySelector(selector)
    if (!el) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    el.remove()

    return {
      success: true,
      data: { success: true, message: `Removed element: ${selector}` },
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}