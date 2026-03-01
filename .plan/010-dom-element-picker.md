# Phase 10: DOM Element Picker

## Goal
Build the visual element selector that lets users pick DOM elements to attach to their prompt.

## UX Flow
1. User clicks the target icon (crosshair) next to the input textarea
2. Side panel sends `picker:start` message to content script
3. Content script enters "pick mode":
   - Mouseover highlights hovered elements with a colored overlay
   - Shows a tooltip with element tag, id, classes
   - Click selects the element
   - Escape cancels pick mode
4. On selection, content script sends back element info:
   - CSS selector (unique, generated)
   - Tag name, id, classes
   - Truncated text content
   - Bounding rect
5. Side panel shows selected element as a dismissible pill in the input area
6. Multiple elements can be picked (click target icon again)
7. When prompt is sent, selected elements are included in the context

## Content Script: Pick Mode (`src/content/picker.ts`)

### Overlay System
- Create a fixed-position transparent overlay div on the page
- On mousemove, calculate which element is under cursor (use `document.elementFromPoint` after temporarily hiding overlay)
- Draw a highlight rectangle using absolute positioning
- Show tooltip near cursor with element info

### Selector Generation
Generate a unique CSS selector for the picked element:
1. If element has `id`: `#myId`
2. If unique within parent by tag+class: `div.my-class`
3. Fallback: `nth-child` chain from nearest identifiable ancestor
4. Verify uniqueness with `querySelectorAll(selector).length === 1`

### Visual Feedback
- Highlight: semi-transparent blue/purple overlay on hovered element
- Selected elements: brief green flash
- All overlays removed when pick mode ends

## Side Panel: Selected Elements
- Pills showing `tag#id.class` or truncated text
- X button on each pill to remove
- Displayed between input textarea and picker button
- Included in the user message sent to the LLM as context:
  ```
  [Selected elements]
  1. <button#submit.btn-primary> "Submit Form" (selector: #submit)
  2. <div.error-message> "Invalid email" (selector: div.error-message)
  ```

## Files to Create
- `src/content/picker.ts` - Pick mode logic, overlay, selector generation
- `src/sidepanel/components/ElementPickerButton.tsx`
- `src/sidepanel/components/SelectedElements.tsx`

## Acceptance
- Hovering highlights elements with overlay
- Clicking selects and returns element info
- Escape cancels pick mode
- Selected elements appear as pills in input area
- Multiple elements can be selected
- Selected elements are included in the prompt context
