// background.js

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "showMeaning",
    title: "意味を表示",
    contexts: ["selection"],
  });

  chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "showMeaning") {
    chrome.windows.getCurrent((currentWindow) => {
      const width = 400;
      const height = 500;
      const left = currentWindow.left + currentWindow.width - width;
      const top = currentWindow.top + 100;

      chrome.windows.create({
        url: `popup.html?word=${encodeURIComponent(info.selectionText)}`,
        type: "popup",
        width: width,
        height: height,
        top: top,
        left: left,
      });
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "searchWord" && request.word) {
    searchWordLocally(request.word, (results) => {
      sendResponse({ definitions: results });
    });
  }
  return true;
});

function searchWordLocally(word, callback) {
  const results = [];
  const request = indexedDB.open("DictionaryDB", 1);

  request.onsuccess = function (event) {
    const db = event.target.result;
    const transaction = db.transaction(["dictionary"], "readonly");
    const store = transaction.objectStore("dictionary");

    const cursorRequest = store.openCursor();
    cursorRequest.onsuccess = function (event) {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.head.toLowerCase().startsWith(word.toLowerCase())) {
          // 分割された説明をリストとして格納
          const descriptions = cursor.value.desc
            .split("||NEWENTRY||")
            .map((desc) => desc.trim());
          results.push({ head: cursor.value.head, descriptions });
        }
        cursor.continue();
      } else {
        console.log("Search results:", results);
        callback(results);
      }
    };

    cursorRequest.onerror = function (event) {
      console.error("Cursor request error:", event.target.error);
      callback([]);
    };
  };

  request.onerror = function (event) {
    console.error("IndexedDB request error:", event.target.error);
    callback([]);
  };
}
