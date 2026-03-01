// TabFlow content script
// Handles DOM operations, element picker, screenshots

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("Content script received:", message)
  sendResponse({ ok: true })
})

export {}
