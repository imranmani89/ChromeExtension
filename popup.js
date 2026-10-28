let previousData = {};
let previousStatuses = {};
let latestDownloads = [];
let latestUpdate = 0;

const filters = {
  search: '',
  status: 'all',
  category: 'all'
};

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

function getFileCategory(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  const categories = {
    '7z': 'archives',
    avi: 'video',
    bmp: 'images',
    csv: 'documents',
    doc: 'documents',
    docx: 'documents',
    flac: 'audio',
    gif: 'images',
    gz: 'archives',
    jpeg: 'images',
    jpg: 'images',
    js: 'other',
    json: 'other',
    mkv: 'video',
    mov: 'video',
    mp3: 'audio',
    mp4: 'video',
    pdf: 'documents',
    png: 'images',
    ppt: 'documents',
    pptx: 'documents',
    rar: 'archives',
    svg: 'images',
    tar: 'archives',
    txt: 'documents',
    wav: 'audio',
    webm: 'video',
    xls: 'documents',
    xlsx: 'documents',
    xml: 'other',
    zip: 'archives'
  };
  return categories[extension] || 'other';
}

function getFileIcon(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  const icons = {
    '7z': '🗜️',
    avi: '🎞️',
    bmp: '🖼️',
    csv: '📊',
    doc: '📄',
    docx: '📄',
    flac: '🎵',
    gif: '🖼️',
    gz: '🗜️',
    jpeg: '🖼️',
    jpg: '🖼️',
    js: '💻',
    json: '💻',
    mkv: '🎞️',
    mov: '🎞️',
    mp3: '🎵',
    mp4: '🎞️',
    pdf: '📕',
    png: '🖼️',
    ppt: '📽️',
    pptx: '📽️',
    rar: '🗜️',
    svg: '🖼️',
    tar: '🗜️',
    txt: '📄',
    wav: '🎵',
    webm: '🎞️',
    xls: '📊',
    xlsx: '📊',
    xml: '💻',
    zip: '🗜️'
  };
  return icons[extension] || '📄';
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function createButton(label, className, action) {
  const button = createTextElement('button', className, label);
  button.type = 'button';
  button.addEventListener('click', action);
  return button;
}

function showMessage(message, isError = false) {
  const messageElement = document.getElementById('operation-message');
  messageElement.textContent = message;
  messageElement.className = isError ? 'operation-message error' : 'operation-message';
}

function runDownloadAction(id, action, successMessage) {
  action(id, () => {
    const error = chrome.runtime.lastError;
    if (error) {
      showMessage(error.message || 'The download action could not be completed.', true);
      console.error(`Unable to ${successMessage.toLowerCase()}:`, error.message);
      return;
    }

    showMessage(successMessage);
    updatePopup();
  });
}

function openDownloadsPage() {
  chrome.tabs.create({ url: 'chrome://downloads/' }, () => {
    const error = chrome.runtime.lastError;
    if (error) {
      showMessage('Unable to open the Downloads page.', true);
      console.error('Unable to open the Downloads page:', error.message);
    }
  });
}

function openSource(url) {
  let sourceUrl;
  try {
    sourceUrl = new URL(url);
  } catch {
    showMessage('This download does not have a valid source link.', true);
    return;
  }
  if (!['http:', 'https:'].includes(sourceUrl.protocol)) {
    showMessage('This download source cannot be opened safely.', true);
    return;
  }

  chrome.tabs.create({ url }, () => {
    const error = chrome.runtime.lastError;
    if (error) {
      showMessage('Unable to open the source page.', true);
      console.error('Unable to open the source page:', error.message);
    }
  });
}

function clearCompletedDownloads() {
  chrome.downloads.erase({ state: 'complete' }, (removedIds) => {
    const error = chrome.runtime.lastError;
    if (error) {
      showMessage('Unable to clear completed downloads.', true);
      console.error('Unable to clear completed downloads:', error.message);
      return;
    }

    showMessage(
      `${removedIds.length} completed ${removedIds.length === 1 ? 'entry' : 'entries'} removed from history. Files remain on your device.`
    );
    updatePopup();
  });
}

function matchesFilters(item, filename) {
  const search = filters.search.trim().toLowerCase();
  const searchableText = `${filename} ${item.url || ''}`.toLowerCase();
  if (search && !searchableText.includes(search)) return false;

  if (filters.status === 'active' && item.state !== 'in_progress') return false;
  if (filters.status === 'paused' && !(item.state === 'in_progress' && item.paused)) return false;
  if (filters.status === 'completed' && item.state !== 'complete') return false;
  if (filters.status === 'cancelled'
    && !(item.state === 'interrupted' && item.error === 'USER_CANCELED')) return false;
  if (filters.status === 'interrupted'
    && !(item.state === 'interrupted' && item.error !== 'USER_CANCELED')) return false;

  return filters.category === 'all' || getFileCategory(filename) === filters.category;
}

function renderDownloads(downloads) {
  const container = document.getElementById('downloads-container');
  container.innerHTML = '';
  const visibleDownloads = downloads.filter((item) => {
    const filename = (item.filename || 'Unknown file').split(/[\\/]/).pop();
    return matchesFilters(item, filename);
  });

  if (visibleDownloads.length === 0) {
    const message = downloads.length === 0
      ? 'No recent downloads'
      : 'No downloads match these filters';
    container.appendChild(createTextElement('div', 'no-downloads', message));
  }

  const currentTimestamp = Date.now();
  const visibleIds = [];

  visibleDownloads.forEach((item) => {
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
        speed = Math.max(0, (bytesReceived - previousData[id].bytesReceived) / timeDiff);
      }
    }

    if (item.state === 'in_progress' && !item.paused) {
      previousData[id] = { bytesReceived, timestamp: currentTimestamp };
    } else {
      delete previousData[id];
    }
    previousStatuses[id] = status === 'Resumed' ? 'Downloading' : status;

    const card = document.createElement('article');
    card.className = 'download-card';

    const heading = document.createElement('div');
    heading.className = 'download-heading';
    const filenameGroup = document.createElement('div');
    filenameGroup.className = 'filename-group';
    const fileIcon = createTextElement('span', 'file-icon', getFileIcon(filename));
    fileIcon.setAttribute('aria-hidden', 'true');
    filenameGroup.appendChild(fileIcon);
    const filenameElement = createTextElement('div', 'filename', filename);
    filenameElement.title = filename;
    filenameGroup.appendChild(filenameElement);
    heading.appendChild(filenameGroup);
    heading.appendChild(createTextElement('span', `status status-${status.toLowerCase()}`, status));
    card.appendChild(heading);

    if (filters.category === 'all') {
      const categoryName = getFileCategory(filename);
      card.appendChild(createTextElement(
        'div',
        'category-label',
        categoryName.charAt(0).toUpperCase() + categoryName.slice(1)
      ));
    }

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

    const actions = document.createElement('div');
    actions.className = 'file-actions';
    if (item.state === 'in_progress') {
      if (item.paused) {
        actions.appendChild(createButton('Resume', 'file-action primary-action', () => {
          runDownloadAction(id, (downloadId, callback) => {
            chrome.downloads.resume(downloadId, callback);
          }, 'Download resumed.');
        }));
      } else {
        actions.appendChild(createButton('Pause', 'file-action', () => {
          runDownloadAction(id, (downloadId, callback) => {
            chrome.downloads.pause(downloadId, callback);
          }, 'Download paused.');
        }));
      }
      actions.appendChild(createButton('Cancel', 'file-action danger-action', () => {
        runDownloadAction(id, (downloadId, callback) => {
          chrome.downloads.cancel(downloadId, callback);
        }, 'Download cancelled.');
      }));
    } else if (item.state === 'complete') {
      actions.appendChild(createButton('Folder', 'file-action', () => chrome.downloads.show(id)));
      actions.appendChild(createButton('Open', 'file-action', () => chrome.downloads.open(id)));
    }
    if (item.url) {
      actions.appendChild(createButton('Source', 'file-action', () => openSource(item.url)));
    }
    if (actions.children.length > 0) card.appendChild(actions);

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
    'no-downloads error-text',
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

    chrome.downloads.search({ orderBy: ['-startTime'], limit: 100 }, (recentDownloads) => {
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
      latestDownloads = Array.from(downloadsById.values()).sort((a, b) => {
        const startA = Date.parse(a.startTime || '') || 0;
        const startB = Date.parse(b.startTime || '') || 0;
        return startB - startA;
      });
      renderDownloads(latestDownloads);
    });
  });
}

document.getElementById('search-downloads').addEventListener('input', (event) => {
  filters.search = event.target.value;
  renderDownloads(latestDownloads);
});
document.getElementById('status-filter').addEventListener('change', (event) => {
  filters.status = event.target.value;
  renderDownloads(latestDownloads);
});
document.getElementById('category-filter').addEventListener('change', (event) => {
  filters.category = event.target.value;
  renderDownloads(latestDownloads);
});
document.getElementById('clear-completed').addEventListener('click', clearCompletedDownloads);
document.getElementById('view-all-downloads').addEventListener('click', openDownloadsPage);

updatePopup();
setInterval(updatePopup, 1000);
