# Live Download Speed Monitor

Live Download Speed Monitor is a lightweight Chrome extension that displays your active downloads in the browser toolbar popup. It shows each file's name, downloaded and total size, a progress bar, and an estimated current download speed.

## Features

- Lists downloads that are currently in progress.
- Shows downloaded bytes and the total size when Chrome has reported it.
- Displays progress and an estimated transfer speed, refreshed every second.
- Uses the filename rather than the full local file path.
- Shows a clear message when there are no active downloads.

The speed estimate is calculated from the change in downloaded bytes between popup updates. It starts at `0 Bytes/s` until the next sample is available. The popup only refreshes while it is open.

## Install for development

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose the folder containing `manifest.json`.
5. Pin the extension from Chrome's Extensions menu if you want to keep it visible in the toolbar.

## Use

Select the extension icon in the toolbar to open the **Active Downloads** popup. Any downloads currently in progress appear with their file size, progress, and estimated speed. Start or resume a download in Chrome to see it listed. When there are no active downloads, the popup displays **No active downloads**.

## Permissions and compatibility

The extension uses the Chrome Downloads API and requests the `downloads` permission to find in-progress downloads. It is built with Manifest V3 and is intended for Chrome and other Chromium-based browsers that support this API.
