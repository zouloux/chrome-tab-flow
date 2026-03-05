# Phase 16: Smart Tab Selection System

## Goal
Implement an intelligent tab selection system that allows users to associate up to 3 tabs with a conversation, with the primary tab automatically tracking the active browser tab until the first message is sent.

## Key Behaviors

### Primary Tab (Auto-tracking)
- **Before first message**: Primary tab automatically updates to reflect the currently active browser tab
- **After first message**: Primary tab is locked and no longer auto-updates
- Primary tab cannot be removed (always present)
- Displayed as a prominent badge at the top of the conversation
- Uses `chrome.tabs.onActivated` listener to track active tab changes

### Additional Tabs (Manual selection)
- User can add up to 2 additional tabs (total max: 3 tabs including primary)
- Additional tabs are manually selected via `[+ tab]` button
- Each additional tab shows as a small rounded rectangle with:
  - Tab title (truncated if too long)
  - Small X button to remove
- Additional tabs remain fixed once added (don't auto-update)

### Tab Switching Tool
- Create new tool `tab_switch` that allows LLM to programmatically switch between associated tabs
- Tool parameters:
  ```typescript
  {
    tabId: number  // ID of tab to switch to (must be in associated tabs)
  }
  ```
- Implements `chrome.tabs.update(tabId, { active: true })`
- This enables LLM to access multiple tabs by switching between them sequentially

### Tab List UI
- Located in InputArea above the textarea
- Replace checkbox list with an "add" button approach
- Each tab item in dropdown is clickable to add (not checkbox)
- Sorted intelligently (see sorting section below)
- Disabled state for tabs that can't be added (already selected or max reached)

### Tab List Sorting (Priority order)
1. **By proximity** (if possible): Use `tab.index` to sort by position in window relative to current tab
   - Tabs adjacent to current tab appear first
   - Calculate distance: `Math.abs(tab.index - currentTab.index)`
2. **Fallback by recent activity**: Use `tab.lastAccessed` property
   - Sort by most recently activated tabs first
   - `tabs.sort((a, b) => b.lastAccessed - a.lastAccessed)`
3. **Current active tab always first** in the list

## Data Model Updates

### StoredConversation
```typescript
interface StoredConversation {
  id: string
  title: string
  tabId: number  // Primary tab (for backward compatibility)
  tabUrl?: string
  messages: StoredMessage[]
  createdAt: number
  updatedAt: number
  associatedTabIds: number[]  // All associated tabs (primary + additional)
  primaryTabLocked: boolean  // True after first message sent
}
```

### UI State
```typescript
interface ConversationTabState {
  primaryTabId: number  // Auto-tracking until locked
  additionalTabIds: number[]  // Max 2 additional tabs
  primaryTabLocked: boolean  // Set to true after first message
}
```

## Implementation Details

### Auto-tracking Primary Tab
```typescript
// In ChatView component or hook
useEffect(() => {
  if (!primaryTabLocked) {
    const listener = (activeInfo: chrome.tabs.TabActiveInfo) => {
      setPrimaryTabId(activeInfo.tabId)
    }
    chrome.tabs.onActivated.addListener(listener)
    return () => chrome.tabs.onActivated.removeListener(listener)
  }
}, [primaryTabLocked])
```

### Locking Primary Tab
```typescript
// When first message is sent:
const handleSendFirstMessage = async (text: string) => {
  // Lock primary tab
  setPrimaryTabLocked(true)

  // Update stored conversation
  if (stored) {
    stored.primaryTabLocked = true
    await saveConversation(stored)
  }

  // Send message with all associated tabs
  const allTabIds = [primaryTabId, ...additionalTabIds]
  await sendMessage(text, allTabIds)
}
```

### Tab List Sorting Implementation
```typescript
async function getSortedTabs(currentTabId: number): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({})
  const currentTab = tabs.find(t => t.id === currentTabId)

  // Sort by proximity if current tab has index
  if (currentTab?.index !== undefined) {
    tabs.sort((a, b) => {
      if (!a.index || !b.index) return 0
      const distA = Math.abs(a.index - currentTab.index)
      const distB = Math.abs(b.index - currentTab.index)
      return distA - distB
    })
  }
  // Fallback: sort by recent activity
  else if (tabs[0]?.lastAccessed !== undefined) {
    tabs.sort((a, b) => {
      const timeA = a.lastAccessed || 0
      const timeB = b.lastAccessed || 0
      return timeB - timeA
    })
  }

  // Ensure current tab is always first
  const currentIndex = tabs.findIndex(t => t.id === currentTabId)
  if (currentIndex > 0) {
    const [currentTab] = tabs.splice(currentIndex, 1)
    tabs.unshift(currentTab)
  }

  return tabs.map(tab => ({
    id: tab.id!,
    title: tab.title ?? "Untitled",
    url: tab.url
  }))
}
```

### Tab Switch Tool Implementation
```typescript
// In src/shared/tools.ts
export const toolSchemas = {
  // ... existing tools

  tab_switch: objectSchema(
    {
      tabId: numberSchema("ID of the tab to switch to"),
    },
    ["tabId"],
    "Switch to a different tab. Only works with tabs associated with this conversation."
  ),
}

// In src/background/tools.ts
async function executeTabSwitch(
  params: unknown,
  associatedTabIds: number[]
): Promise<ToolResult<unknown>> {
  const { tabId } = params as { tabId: number }

  // Validate tab is associated
  if (!associatedTabIds.includes(tabId)) {
    return {
      success: false,
      error: `Tab ${tabId} is not associated with this conversation. Associated tabs: ${associatedTabIds.join(", ")}`
    }
  }

  try {
    await chrome.tabs.update(tabId, { active: true })
    // Small delay to ensure tab is activated
    await new Promise(resolve => setTimeout(resolve, 100))

    return {
      success: true,
      data: { tabId, switched: true }
    }
  } catch (e) {
    return {
      success: false,
      error: `Failed to switch to tab: ${e}`
    }
  }
}
```

## UI Changes

### Conversation Header (New)
Create a new component `ConversationHeader` that displays:
- Primary tab badge (always visible, larger, primary color)
- Additional tab badges (smaller, secondary color, with X button)
- Position: Above MessageList, below Header

```typescript
interface ConversationHeaderProps {
  primaryTab: TabInfo
  additionalTabs: TabInfo[]
  onRemoveAdditionalTab: (tabId: number) => void
  primaryTabLocked: boolean  // For visual indication
}
```

### InputArea Updates
- Change `[+]` button text to `[+ tab]`
- Remove checkbox list, use direct click-to-add
- Show "Max 3 tabs" message when limit reached
- Visual indicators:
  - Already selected tabs: Checkmark icon + disabled
  - Available tabs: Clickable
  - Current tab: Badge saying "(current)"

## System Prompt Updates
Update system prompt to explain the tab switching capability:

```
## Multi-Tab Access
You have access to multiple tabs in this conversation. To read or interact with a different tab:
1. Use the `tab_switch` tool to switch to the desired tab
2. Wait for confirmation
3. Execute your page reading/interaction tools
4. Switch back to other tabs as needed

Associated tabs:
- Tab {id}: {title} (primary)
- Tab {id}: {title}
- Tab {id}: {title}

Note: Switching tabs is visible to the user, so explain what you're doing.
```

## Files to Modify

### Types
- `src/shared/types.ts` - Add `primaryTabLocked` to conversation types

### Storage
- `src/background/storage.ts` - Update `StoredConversation` interface

### Background
- `src/background/tools.ts` - Add `executeTabSwitch` function
- `src/background/orchestrator.ts` - Pass `associatedTabIds` to tool executor

### Shared
- `src/shared/tools.ts` - Add `tab_switch` tool schema
- `src/shared/system-prompt.ts` - Update prompt with tab switching instructions

### UI Components
- Create `src/sidepanel/components/ConversationHeader.tsx` - Display tab badges
- `src/sidepanel/components/InputArea.tsx` - Update tab selection UI
- `src/sidepanel/App.tsx` - Integrate ConversationHeader, manage tab state
- `src/sidepanel/hooks/useChat.ts` - Add primary tab locking logic

## Acceptance Criteria

1. ✅ Primary tab auto-tracks active browser tab before first message
2. ✅ Primary tab locks after first message is sent
3. ✅ User can add up to 2 additional tabs (max 3 total)
4. ✅ Additional tabs can be removed via X button
5. ✅ Primary tab cannot be removed
6. ✅ Tab list is sorted by proximity to current tab (or by recent activity as fallback)
7. ✅ Current tab always appears first in dropdown
8. ✅ LLM can switch between tabs using `tab_switch` tool
9. ✅ Tab badges display in conversation header
10. ✅ Clean, intuitive UX with `[+ tab]` button

## Edge Cases to Handle

1. **Tab closed**: If an associated tab is closed, remove it from the list and show warning to user
2. **Tab navigation**: If user navigates in an associated tab, update the tab title/url in the badge
3. **Window switching**: If tabs are in different windows, tab switching brings the window to front
4. **First message with no primary tab**: Should not be possible, but fallback to current active tab
5. **Tab switch timeout**: If switch takes too long (>2s), return error to LLM

## Performance Considerations

- Tab list sorting should be fast (<50ms)
- Use `chrome.tabs.onActivated` efficiently (debounce if needed)
- Cache sorted tab list for 1-2 seconds to avoid re-sorting on every render
- Inject content scripts lazily only when needed

## Future Enhancements (Not in this phase)
- Visual indication when LLM switches tabs (toast notification)
- Tab preview thumbnails in selection dropdown
- Remember tab associations across browser sessions
- Support for more than 3 tabs with pagination
