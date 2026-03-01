# Phase 1: Project Setup

## Goal
Initialize the Bun project, install deps, configure build pipeline, create manifest.json.

## Steps

### 1.1 Init & Dependencies
```bash
bun init
bun add react react-dom
bun add -d @types/react @types/react-dom @types/chrome typescript tailwindcss
```

### 1.2 TypeScript Config
- `tsconfig.json`: strict mode, JSX react-jsx, paths alias `@/` -> `src/`
- Target ES2022 (service workers need modern JS)

### 1.3 Tailwind Config
- `tailwind.config.js`: content paths for `src/**/*.{ts,tsx}`
- Dark mode: `class` strategy (always dark in our case)
- Custom font: system monospace stack

### 1.4 Build Script
Create `build.ts` (Bun script) that:
- Bundles `src/background/index.ts` -> `dist/background.js`
- Bundles `src/sidepanel/index.tsx` -> `dist/sidepanel.js` + copies `sidepanel.html`
- Bundles `src/content/index.ts` -> `dist/content.js`
- Processes Tailwind -> `dist/styles.css`
- Copies `manifest.json` + icons to `dist/`
- Watch mode for dev (`--watch` flag)

### 1.5 Manifest V3
Create `manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "TabFlow",
  "version": "0.1.0",
  "description": "AI-powered tab control and analysis",
  "permissions": [
    "activeTab",
    "sidePanel",
    "storage",
    "scripting",
    "tabs"
  ],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }],
  "action": {
    "default_title": "TabFlow"
  },
  "icons": { "16": "icon16.png", "48": "icon48.png", "128": "icon128.png" }
}
```

### 1.6 Directory Structure
```
src/
  background/index.ts
  sidepanel/index.tsx
  sidepanel/App.tsx
  content/index.ts
  shared/types.ts
  shared/constants.ts
public/
  manifest.json
  sidepanel.html
  icons/
build.ts
```

## Files to Create
- `package.json`, `tsconfig.json`, `tailwind.config.js`
- `build.ts`
- `public/manifest.json`, `public/sidepanel.html`
- Placeholder icons (simple colored squares, replace later)
- All `src/` stub files (empty exports)

## Acceptance
- `bun run build` produces a `dist/` folder
- Extension loads in `chrome://extensions` without errors
- Side panel opens (empty) when clicking the extension icon
