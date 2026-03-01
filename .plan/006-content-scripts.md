# Phase 6: Content Scripts

## Goal
Implement all content-script-side tool handlers: DOM reading, manipulation, screenshots, and YouTube.

## Architecture

### Entry Point (`src/content/index.ts`)
- Listens for messages from background
- Routes to appropriate handler based on tool name
- Returns serialized results

### Tool Handlers

#### Page Reader (`src/content/tools/page-reader.ts`)
**`page_get_content`**:
- `format: "text"`: `document.body.innerText` (truncated to maxLength)
- `format: "html"`: Cleaned HTML (strip scripts, styles, ads). Use a recursive DOM walker.
- `format: "markdown"`: Basic HTML-to-markdown conversion (headings, links, lists, bold/italic). No dependency, simple recursive converter.
- `selector`: If provided, scope to that element only

**`page_get_metadata`**:
- Title, URL, canonical URL
- Meta description, keywords
- OpenGraph tags (og:title, og:description, og:image)
- `<html lang>` attribute

**`page_query_selector`**:
- Run `querySelectorAll(selector)`
- Return array of `{ tag, text, attributes, index }` (limited to `limit` results)
- Text truncated to 200 chars per element

**`page_get_element_info`**:
- Single element detailed info
- Tag, id, classes, all attributes
- innerText (truncated), innerHTML (truncated)
- Bounding rect, computed display/visibility/opacity
- Parent chain (tag#id.class for each ancestor)

#### Page Actions (`src/content/tools/page-actions.ts`)
**`page_click`**: querySelector -> `.click()`. Also dispatch `mousedown`, `mouseup`, `click` events for frameworks that listen to those.

**`page_fill`**: querySelector -> set `.value`, dispatch `input`, `change` events. Handle React's synthetic events by using native input setter.

**`page_select`**: querySelector on `<select>` -> set `.value`, dispatch `change`.

**`page_scroll`**: `window.scrollBy()` or `element.scrollBy()`. Default amount: 500px.

**`page_wait`**: Poll with `MutationObserver` or `setInterval` for selector match, with timeout.

#### DOM Manipulator (`src/content/tools/dom-manipulator.ts`)
**`dom_modify_attribute`**: `setAttribute` / `removeAttribute`. Value `null` removes.

**`dom_modify_style`**: `element.style[prop] = value` for each style entry.

**`dom_modify_class`**: `classList.add/remove/toggle`.

**`dom_insert_html`**: `insertAdjacentHTML()`.

**`dom_remove`**: `element.remove()`.

#### Screenshot (`src/content/tools/screenshot.ts`)
- Uses `chrome.tabs.captureVisibleTab()` from background (not content script)
- For element screenshots: content script returns element bounding rect, background captures full viewport, then crops using OffscreenCanvas
- Returns base64 PNG

#### YouTube (`src/content/tools/youtube.ts`)
**`youtube_get_transcript`**:
- Parse `ytInitialPlayerResponse` from page scripts for caption track URLs
- Or find the transcript panel in DOM and extract text
- Fallback: fetch captions XML from the `timedtext` API URL embedded in player config
- Return timestamped text array

**`youtube_get_video_info`**:
- Parse `ytInitialData` or `ytInitialPlayerResponse` from page
- Extract: title, channel, description, duration, view count, publish date, tags

## Files to Create
- `src/content/index.ts` - Message router
- `src/content/tools/page-reader.ts`
- `src/content/tools/page-actions.ts`
- `src/content/tools/dom-manipulator.ts`
- `src/content/tools/screenshot.ts`
- `src/content/tools/youtube.ts`

## Acceptance
- Each tool executes correctly on a test page
- Results are serializable (no DOM nodes in responses)
- Screenshot captures work for viewport and elements
- YouTube transcript extraction works on a YouTube video page
