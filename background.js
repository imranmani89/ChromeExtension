let latestBadgeUpdate = 0;

function updateBadge() {
  const updateId = ++latestBadgeUpdate;

  chrome.downloads.search({ state: 'in_progress' }, (downloads) => {
    if (chrome.runtime.lastError) {
      console.error('Unable to count active downloads:', chrome.runtime.lastError.message);
      return;
    }

    if (updateId !== latestBadgeUpdate) {
      return;
    }

    chrome.action.setBadgeText({
      text: downloads.length === 0 ? '' : String(downloads.length)
    });
  });
}

chrome.downloads.onCreated.addListener(updateBadge);
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state) {
    updateBadge();
  }
});
chrome.downloads.onErased.addListener(updateBadge);

updateBadge();
