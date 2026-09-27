// DesmosDT - Extension Popup Logic
document.addEventListener('DOMContentLoaded', () => {
  const statusText = document.getElementById('status-text');

  // Check if current active tab is desmos
  if (chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].url && tabs[0].url.includes('desmos.com/calculator')) {
        statusText.textContent = 'Active on Current Desmos Tab';
        statusText.style.color = '#059669';
      }
    });
  }
});
