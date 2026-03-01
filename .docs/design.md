# TabFlow - Design Specification

## Design Principles
- **Minimal**: No visual clutter, every element has a purpose
- **Dark**: Dark mode only, easy on the eyes
- **Monospace**: Consistent monospace typography throughout
- **Clear**: High contrast text, readable at a glance
- **Spacious**: Generous padding, breathing room between elements

## Color Palette

### Backgrounds
- `bg-primary`: `#0a0a0a` - Main panel background
- `bg-secondary`: `#141414` - Cards, input fields, message bubbles
- `bg-tertiary`: `#1e1e1e` - Hover states, active items
- `bg-accent`: `#2a2a2a` - Borders, separators

### Text
- `text-primary`: `#e5e5e5` - Main text
- `text-secondary`: `#a0a0a0` - Secondary text, timestamps, labels
- `text-muted`: `#666666` - Disabled, placeholder text
- `text-accent`: `#60a5fa` - Links, interactive elements (blue-400)

### Accents
- `accent-blue`: `#3b82f6` - Primary actions, send button
- `accent-red`: `#ef4444` - Stop button, errors, destructive
- `accent-green`: `#22c55e` - Success states
- `accent-yellow`: `#eab308` - Warnings
- `accent-purple`: `#a855f7` - Element picker highlight

### Borders
- Default border: `#2a2a2a` (1px solid)
- Focus border: `#3b82f6` (blue accent)

## Typography
- **Font family**: `'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace`
- **Base size**: 13px
- **Line height**: 1.5
- **Headings**: same font, weight 600
- Sizes: H1 18px, H2 16px, H3 14px, body 13px, small 11px

## Spacing
- Base unit: 4px
- Padding small: 8px (p-2)
- Padding medium: 12px (p-3)
- Padding large: 16px (p-4)
- Gap between messages: 12px
- Section gaps: 16px

## Border Radius
- Small (buttons, inputs): 6px (rounded-md)
- Medium (cards, messages): 8px (rounded-lg)
- Large (panels): 12px (rounded-xl)

## Layout

### Side Panel (300-600px wide)
```
┌──────────────────────────┐
│  ☰ TabFlow      ⚙  [+]  │ ← Header (40px)
├──────────────────────────┤
│                          │
│  [User message]          │
│                          │
│  [Assistant message      │
│   with markdown and      │
│   tool call indicators]  │
│                          │
│  [User message]          │
│                          │
│  [Assistant streaming...] │
│                          │ ← Message list (flex-1, scrollable)
├──────────────────────────┤
│  [element] [element] ×   │ ← Selected elements (conditional)
├──────────────────────────┤
│  ⊕ │ Type message...   ▶ │ ← Input area (auto-height)
├──────────────────────────┤
│  ▾ Conversations         │
│  ├ Page analysis  2m ago │
│  ├ Form debug   Yesterday│
│  └ YouTube sum  Jan 15   │ ← Conversation list (collapsible)
└──────────────────────────┘
```

### Message Styles
- **User**: `bg-secondary` background, full width, `text-primary`
- **Assistant**: No background (transparent), `text-primary`, with markdown
- **Thinking**: `bg-secondary` background, `text-secondary`, italic, collapsible with "Thinking..." header
- **Tool call**: Small inline pill, `bg-tertiary`, `text-secondary`, expand on click

### Input Area
- Textarea: `bg-secondary`, `border border-accent`, rounded-lg
- Min height: 40px, max height: 200px, auto-resize
- Picker button: left of textarea, icon only, `text-secondary` -> `text-accent` on hover
- Send button: right of textarea, `bg-accent-blue` when active, `bg-tertiary` when disabled
- Stop button: same position as send, `bg-accent-red`, square icon

### Settings Panel
- Full panel replacement (not modal)
- Back arrow in header
- Sections with clear labels
- Inputs: `bg-secondary`, border, rounded
- Toggles: pill-shaped, `bg-accent-blue` when on, `bg-tertiary` when off
- API key inputs: password type with eye icon toggle

### Conversation List
- Collapsible section at bottom
- Each item: single line, title left, date right
- Active conversation highlighted with `bg-tertiary`
- Delete on hover (× icon, right side)
- "New Chat" at top of list

## Animations
- Message appear: fade in, slight slide up (150ms)
- Streaming text: no animation (just append)
- Tool call spinner: rotate animation
- Panel transitions: slide (200ms ease)
- Hover states: 100ms transition

## Icons
- Use simple inline SVGs, no icon library
- 16px default size
- Stroke-based, 1.5px stroke width
- Icons needed: settings gear, plus (new chat), send arrow, stop square, target/crosshair (picker), chevron, X close, eye/eye-off, expand/collapse
