// utils.js

export function adjustPopupSize() {
  const body = document.body;
  const html = document.documentElement;
  const height =
    Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    ) + 40; // ボタンのために追加の高さを確保
  const width = Math.max(
    body.scrollWidth,
    body.offsetWidth,
    html.clientWidth,
    html.scrollWidth,
    html.offsetWidth
  );
  chrome.runtime.getPlatformInfo(function (info) {
    if (info.os === "mac") {
      // Macのウィンドウサイズ調整
      chrome.windows.getCurrent(function (win) {
        chrome.windows.update(win.id, {
          width: Math.min(width + 20, screen.availWidth),
          height: Math.min(height + 20, screen.availHeight),
        });
      });
    } else {
      // 他のOSのウィンドウサイズ調整
      chrome.windows.getCurrent(function (win) {
        chrome.windows.update(win.id, {
          width: Math.min(width, screen.availWidth),
          height: Math.min(height, screen.availHeight),
        });
      });
    }
  });
}
