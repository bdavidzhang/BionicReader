document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const percentageSlider = document.getElementById('percentageSlider');
  const percentageValue = document.getElementById('percentageValue');

  // Load saved settings and update the UI
  chrome.storage.sync.get(['isEnabled', 'boldPercentage'], (data) => {
    toggleSwitch.checked = !!data.isEnabled;
    percentageSlider.value = data.boldPercentage || 50;
    percentageValue.textContent = `${percentageSlider.value}%`;
  });

  // Handle toggle switch changes
  toggleSwitch.addEventListener('change', () => {
    const isEnabled = toggleSwitch.checked;
    chrome.storage.sync.set({ isEnabled });
    sendMessageToContentScript({ action: 'toggle', value: isEnabled });
  });

  // Handle slider changes
  percentageSlider.addEventListener('input', () => {
    const boldPercentage = percentageSlider.value;
    percentageValue.textContent = `${boldPercentage}%`;
  });
  
  percentageSlider.addEventListener('change', () => {
    const boldPercentage = percentageSlider.value;
    chrome.storage.sync.set({ boldPercentage });
    sendMessageToContentScript({ action: 'percentageChange', value: boldPercentage });
  });

  // Helper to send messages to the active tab
  function sendMessageToContentScript(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, message);
    });
  }
});