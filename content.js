let isEnabled = true;
let boldPercentage = 50;

// --- CORE BOLDING LOGIC ---

function processTextNode(node, percentage) {
  // --- FIX IS HERE ---
  // Instead of checking the direct parent, check if the node is anywhere INSIDE a processed span.
  if (node.parentElement.closest('.bionic-reader-processed')) {
    return;
  }
  
  const originalText = node.nodeValue;
  // Use a regex to split by words and capture whitespace to preserve it
  const words = originalText.split(/(\s+)/);
  
  if (words.every(word => word.trim().length <= 2)) return;

  const fragment = document.createDocumentFragment();

  words.forEach(word => {
    if (word.trim().length > 2) {
      const mid = Math.ceil(word.length * (percentage / 100));
      const firstHalf = word.substring(0, mid);
      const secondHalf = word.substring(mid);

      const strong = document.createElement('strong');
      strong.textContent = firstHalf;
      fragment.appendChild(strong);
      fragment.appendChild(document.createTextNode(secondHalf));
    } else {
      fragment.appendChild(document.createTextNode(word));
    }
  });
  
  const wrapper = document.createElement('span');
  wrapper.className = 'bionic-reader-processed';
  wrapper.dataset.originalText = originalText;
  wrapper.appendChild(fragment);
  
  // Check if node is still in the document before replacing
  if (node.parentNode) {
    node.parentNode.replaceChild(wrapper, node);
  }
}

function applyBoldingToAllText(percentage) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let node;
  const nodesToProcess = [];
  while (node = walker.nextNode()) {
      // Additional check to avoid processing text in script/style tags
      const parentTag = node.parentElement.tagName.toLowerCase();
      if (parentTag !== 'script' && parentTag !== 'style' && node.nodeValue.trim().length > 0) {
        nodesToProcess.push(node);
      }
  }
  nodesToProcess.forEach(node => processTextNode(node, percentage));
}

function revertBolding() {
  // This might try to revert nodes that are in the process of being changed.
  // A querySelectorAll is safer as it's a static list.
  const processedSpans = document.querySelectorAll('span.bionic-reader-processed');
  processedSpans.forEach(span => {
    if (span.parentNode) { // Ensure the span is still in the DOM
      const originalTextNode = document.createTextNode(span.dataset.originalText);
      span.parentNode.replaceChild(originalTextNode, span);
    }
  });
}

// --- INITIALIZATION AND MESSAGE HANDLING ---

function initialize() {
  chrome.storage.sync.get(['isEnabled', 'boldPercentage'], (data) => {
    isEnabled = data.isEnabled !== false; // Default to true if undefined
    boldPercentage = data.boldPercentage || 50;
    if (isEnabled) {
      applyBoldingToAllText(boldPercentage);
    }
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    isEnabled = request.value;
    if (isEnabled) {
      applyBoldingToAllText(boldPercentage);
    } else {
      revertBolding();
    }
  } else if (request.action === 'percentageChange') {
    boldPercentage = request.value;
    if (isEnabled) {
      // Revert first, then re-apply with the new percentage
      revertBolding();
      applyBoldingToAllText(boldPercentage);
    }
  }
  // It's good practice to return true for asynchronous message handlers
  return true;
});

// Handle dynamically loaded content
const observer = new MutationObserver((mutations) => {
  if (!isEnabled) return; // Don't do anything if the feature is disabled

  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((newNode) => {
      if (newNode.nodeType === Node.ELEMENT_NODE) {
        const walker = document.createTreeWalker(newNode, NodeFilter.SHOW_TEXT, null, false);
        let node;
        const nodesToProcess = [];
        while(node = walker.nextNode()) {
            nodesToProcess.push(node);
        }
        nodesToProcess.forEach(node => processTextNode(node, boldPercentage));
      }
    });
  });
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Run on initial page load
initialize();