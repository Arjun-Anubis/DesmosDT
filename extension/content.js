// DesmosDT - Content Script
// Injects the core runtime into the page context (Main World) to access window.Calc

(function() {
  console.log('[DesmosDT] Initializing content script...');

  // Inject CSS
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.type = 'text/css';
  styleLink.href = chrome.runtime.getURL('styles.css');
  (document.head || document.documentElement).appendChild(styleLink);

  // Inject Main World Script
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.type = 'text/javascript';
  script.onload = function() {
    console.log('[DesmosDT] Injected runtime successfully loaded.');
    this.remove(); // Clean up script tag once executed
  };
  script.onerror = function(err) {
    console.error('[DesmosDT] Failed to inject runtime script:', err);
  };

  (document.head || document.documentElement).appendChild(script);

  // Listen for messages from injected.js or popup.js
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'desmos-dt') {
      return;
    }
    // Forward any required events to extension background or storage if needed
  });

  // Listen for messages from extension popup
  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'PING') {
        sendResponse({ status: 'ACTIVE', version: '1.0.0' });
      } else if (request.action === 'INSERT_SIGNAL') {
        window.postMessage({ source: 'desmos-dt-popup', action: 'INSERT_SIGNAL', payload: request.payload }, '*');
        sendResponse({ status: 'OK' });
      }
    });
  }
})();
