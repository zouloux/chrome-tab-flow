# TabFlow - Product Requirements Document

## Overview
TabFlow is a Chrome extension that adds an AI-powered side panel for controlling and analyzing browser tabs. Users interact with an AI assistant that can read, manipulate, and navigate web pages.

## Target Users
- Developers debugging/testing web apps
- Researchers summarizing web content
- Power users automating repetitive browser tasks
- Anyone wanting AI-assisted web browsing

## Core Features

### 1. AI Chat Interface
- Side panel opens when extension icon is clicked
- Chat-style interface with streaming AI responses
- Supports markdown rendering in responses
- Shows reasoning/thinking when enabled
- Send with Cmd+Enter, newline with Enter
- Stop button to abort AI generation
- User can type next prompt while AI is responding

### 2. Page Analysis
- AI can read full page content (text, HTML, simplified markdown)
- Extracts page metadata (title, description, OpenGraph)
- Queries specific elements by CSS selector
- Takes viewport and element screenshots for visual analysis
- Supports all standard web pages

### 3. Page Interaction
- Click elements
- Fill form fields
- Select dropdown options
- Scroll page and elements
- Navigate to URLs
- Wait for elements to appear

### 4. DOM Manipulation
- Modify element attributes (e.g., remove `disabled`)
- Change inline styles (e.g., `display: block`)
- Add/remove CSS classes
- Insert HTML content
- Remove elements

### 5. YouTube Integration
- Detects YouTube video pages automatically
- Extracts video transcript (manual + auto-generated captions)
- Gets video metadata (title, channel, description, duration)
- Provides full context for AI summarization

### 6. DOM Element Picker
- Visual element selector activated by target icon
- Hover highlights elements on the page
- Click to select, attach to prompt as context
- Multiple elements selectable
- Shows element info as dismissible pills

### 7. Conversation Management
- Auto-saves all conversations
- Lists past conversations with title and date
- Load, delete, create new conversations
- Auto-generated titles from first message
- Persists across browser sessions

### 8. Settings
- API keys for Anthropic, OpenAI, Google Gemini
- Default provider and model selection
- Reasoning/thinking toggle
- Max tokens and temperature controls

## Non-Goals (v1)
- No multi-tab support (one tab per conversation)
- No file upload
- No voice input
- No extension marketplace distribution (local dev only)
- No authentication/accounts
- No collaborative features

## Success Criteria
- Extension loads without errors
- AI can successfully read and interact with any standard web page
- Streaming responses feel responsive (<500ms to first token after API responds)
- YouTube transcripts extract reliably
- Settings persist correctly
- Conversations survive browser restart
