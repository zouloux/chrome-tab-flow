// TabFlow background service worker
// Handles LLM calls, message routing, and state management

chrome.runtime.onInstalled.addListener(() => {
  console.log("TabFlow installed")
})

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id! })
})

export {}
