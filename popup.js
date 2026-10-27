let previousData = {};

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function updatePopup() {
  // Query Chrome directly for active downloads
  chrome.downloads.search({ state: 'in_progress' }, (results) => {
    const container = document.getElementById('downloads-container');
    container.innerHTML = '';

    if (!results || results.length === 0) {
      container.innerHTML = '<div class="no-downloads">No active downloads</div>';
      return;
    }

    const currentTimestamp = Date.now();

    results.forEach((item) => {
      const id = item.id;
      const bytesReceived = item.bytesReceived || 0;
      const totalBytes = item.totalSize || item.fileSize || 0;
      const filename = item.filename.split('\\').pop().split('/').pop();

      // Calculate speed
      let speed = 0;
      if (previousData[id]) {
        let timeDiff = (currentTimestamp - previousData[id].timestamp) / 1000; // seconds
        if (timeDiff > 0) {
          let bytesDiff = bytesReceived - previousData[id].bytesReceived;
          speed = Math.max(0, bytesDiff / timeDiff);
        }
      }

      // Save current state for next second's calculation
      previousData[id] = {
        bytesReceived: bytesReceived,
        timestamp: currentTimestamp
      };

      let card = document.createElement('div');
      card.className = 'download-card';
      card.innerHTML = `
        <div class="filename" title="${filename}">${filename}</div>
        <progress value="${bytesReceived}" max="${totalBytes > 0 ? totalBytes : 100}"></progress>
        <div class="details">
          <span>${formatBytes(bytesReceived)} / ${totalBytes ? formatBytes(totalBytes) : 'Unknown'}</span>
          <span style="font-weight: bold; color: #0066cc;">${formatBytes(speed)}/s</span>
        </div>
      `;
      container.appendChild(card);
    });

    // Cleanup finished/removed items from our tracking object
    const activeIds = results.map(r => r.id);
    Object.keys(previousData).forEach(id => {
      if (!activeIds.includes(Number(id))) {
        delete previousData[id];
      }
    });
  });
}

// Run immediately when opened, then poll every second
updatePopup();
setInterval(updatePopup, 1000);