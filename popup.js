let previousData = {};
let previousStatuses = {};
let latestUpdate = 0;

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatTimeRemaining(seconds) {
  const remaining = Math.ceil(seconds);
  if (remaining < 60) return `${remaining} sec`;

  const minutes = Math.ceil(remaining / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days} day ${remainingHours} hr` : `${days} day`;
}

function getDownloadStatus(item, previousStatus) {
  if (item.state === 'complete') return 'Completed';
  if (item.state === 'interrupted') {
    return item.error === 'USER_CANCELED' ? 'Cancelled' : 'Interrupted';
  }
  if (item.paused) return 'Paused';
  if (previousStatus === 'Paused' || previousStatus === 'Interrupted') return 'Resumed';
  return 'Downloading';
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderDownloads(downloads) {
  const container = document.getElementById('downloads-container');
  container.innerHTML = '';

  if (downloads.length === 0) {
    container.appendChild(createTextElement('div', 'no-downloads', 'No recent downloads'));
    return;
  }

  const currentTimestamp = Date.now();
  const visibleIds = [];

  downloads.forEach((item) => {
    const id = item.id;
    const bytesReceived = item.bytesReceived || 0;
    const totalBytes = item.totalBytes > 0
      ? item.totalBytes
      : item.fileSize > 0 ? item.fileSize : 0;
    const filename = (item.filename || 'Unknown file').split(/[\\/]/).pop();
    const status = getDownloadStatus(item, previousStatuses[id]);
    visibleIds.push(id);

    let speed = 0;
    if (item.state === 'in_progress' && !item.paused && previousData[id]) {
      const timeDiff = (currentTimestamp - previousData[id].timestamp) / 1000;
      if (timeDiff > 0) {
        const bytesDiff = bytesReceived - previousData[id].bytesReceived;
        speed = Math.max(0, bytesDiff / timeDiff);
      }
    }

    if (item.state === 'in_progress' && !item.paused) {
      previousData[id] = { bytesReceived, timestamp: currentTimestamp };
    } else {
      delete previousData[id];
    }
    previousStatuses[id] = status === 'Resumed' ? 'Downloading' : status;

    const card = document.createElement('div');
    card.className = 'download-card';

    const heading = document.createElement('div');
    heading.className = 'download-heading';
    const filenameElement = createTextElement('div', 'filename', filename);
    filenameElement.title = filename;
    heading.appendChild(filenameElement);
    heading.appendChild(createTextElement(
      'span',
      `status status-${status.toLowerCase()}`,
      status
    ));
    card.appendChild(heading);

    const progress = document.createElement('progress');
    if (totalBytes > 0) {
      progress.max = totalBytes;
      progress.value = Math.min(bytesReceived, totalBytes);
    } else if (item.state === 'complete') {
      progress.max = 100;
      progress.value = 100;
    } else {
      progress.removeAttribute('value');
    }
    card.appendChild(progress);

    const details = document.createElement('div');
    details.className = 'details';
    details.appendChild(createTextElement(
      'span',
      '',
      `${formatBytes(bytesReceived)} / ${totalBytes ? formatBytes(totalBytes) : 'Unknown'}`
    ));
    details.appendChild(createTextElement(
      'span',
      'speed',
      item.state === 'in_progress' && !item.paused ? `${formatBytes(speed)}/s` : ''
    ));
    card.appendChild(details);

    if (item.state === 'in_progress' && !item.paused) {
      let remaining = 'Unknown';
      if (totalBytes > bytesReceived) {
        remaining = speed > 0
          ? formatTimeRemaining((totalBytes - bytesReceived) / speed)
          : 'Calculating...';
      } else if (totalBytes > 0) {
        remaining = 'Almost done';
      }
      card.appendChild(createTextElement('div', 'time-remaining', `Time remaining: ${remaining}`));
    }

    container.appendChild(card);
  });

  Object.keys(previousStatuses).forEach((id) => {
    if (!visibleIds.includes(Number(id))) {
      delete previousStatuses[id];
      delete previousData[id];
    }
  });
}

function showLoadError(message, error) {
  console.error(message, error);
  const container = document.getElementById('downloads-container');
  container.innerHTML = '';
  container.appendChild(createTextElement(
    'div',
    'no-downloads',
    'Unable to load downloads. Please try again.'
  ));
}

function updatePopup() {
  const updateId = ++latestUpdate;

  chrome.downloads.search({ state: 'in_progress' }, (activeDownloads) => {
    const activeError = chrome.runtime.lastError;
    if (activeError) {
      if (updateId === latestUpdate) {
        showLoadError('Unable to load active downloads:', activeError.message);
      }
      return;
    }

    chrome.downloads.search({ orderBy: ['-startTime'], limit: 10 }, (recentDownloads) => {
      const recentError = chrome.runtime.lastError;
      if (recentError) {
        if (updateId === latestUpdate) {
          showLoadError('Unable to load recent downloads:', recentError.message);
        }
        return;
      }
      if (updateId !== latestUpdate) return;

      const downloadsById = new Map();
      activeDownloads.forEach((item) => downloadsById.set(item.id, item));
      recentDownloads.forEach((item) => downloadsById.set(item.id, item));
      const downloads = Array.from(downloadsById.values())
        .sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
      renderDownloads(downloads);
    });
  });
}

updatePopup();
setInterval(updatePopup, 1000);
