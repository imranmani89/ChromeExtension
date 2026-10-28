# Live Download Speed Monitor

Live Download Speed Monitor is a lightweight Chrome extension that displays your active downloads in the browser toolbar. Its icon badge shows the live number of active downloads, and the popup shows each file's name, downloaded and total size, a progress bar, and an estimated current download speed.

## Features

- Lists downloads that are currently in progress.
- Shows the live active-download count on the extension icon and clears the badge when there are none.
- Shows downloaded bytes and the total size when Chrome has reported it.
- Displays progress and an estimated transfer speed, refreshed every second.
- Estimates time remaining while a download is in progress.
- Shows the status of recent downloads, including downloading, paused, resumed, completed, cancelled, and interrupted.
- Shows the full saved location of each download, with actions to reveal completed files in their folder or open them.
- Provides pause, resume, and cancel controls for active downloads.
- Lets you search recent downloads and filter by status or file category.
- Removes completed entries from Chrome's download history without deleting the downloaded files.
- Opens the original source page for downloads when the source uses HTTP or HTTPS.
- Provides a shortcut to Chrome's full Downloads page.
- Keeps filenames prominent while showing the saved path as secondary information.
- Shows a clear message when there are no recent downloads.

The speed estimate is calculated from the change in downloaded bytes between popup updates. It starts at `0 Bytes/s` until the next sample is available. The popup only refreshes while it is open.

## Build a distributable package

The packaging script requires Node.js and has no third-party dependencies. From the repository directory, run:

```sh
node pack-extension.js
```

This creates `dist/live-download-speed-monitor.zip`. The archive contains the extension's manifest, popup files, and background service worker. The generated `dist/` folder and any `.pem` private keys or `.crx` files are ignored by Git.

## Install in Chrome

Chrome does not install an extension directly from this ZIP. Extract the ZIP to a folder, then:

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Select **Load unpacked** and choose the extracted folder containing `manifest.json`.
4. Pin the extension from Chrome's Extensions menu if you want to keep it visible in the toolbar.

For development, you can also load the repository directory directly using the same steps; no build is needed.

## Use

The badge on the extension icon shows the number of downloads currently in progress. Select the icon to open the download manager. Search by filename or source site, or filter by status and file category. The popup shows up to 100 recent downloads and scrolls the list independently of its footer. Active downloads include controls to pause, resume, or cancel them, alongside progress, estimated speed, and estimated time remaining. Recent items show their saved location; completed items include **Folder** and **Open** actions. **Source** opens the original HTTP(S) page. **Clear completed** removes completed entries from Chrome's download history but does not delete the files from the device. Select **View all downloads** at the bottom to open Chrome's full Downloads page. The remaining-time estimate starts calculating after a speed sample is available.

## Permissions and compatibility

The extension uses the Chrome Downloads API and requests the `downloads` permission to find in-progress downloads. It is built with Manifest V3 and is intended for Chrome and other Chromium-based browsers that support this API.
