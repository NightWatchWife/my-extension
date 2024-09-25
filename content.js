// content.js

console.log("Content script loaded.");

// バックグラウンドスクリプトからのメッセージをリスン
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("Message received in content script:", request);
  if (request.action === "searchWord" && request.word) {
    console.log(
      "Sending message to background script to search for word:",
      request.word
    );
    // バックグラウンドスクリプトに単語を送信して意味を検索
    chrome.runtime
      .sendMessage({
        action: "searchWord",
        word: request.word,
      })
      .then((response) => {
        console.log("Received response from background script:", response);
        // ポップアップを開いて検索結果を表示
        chrome.runtime.sendMessage({
          action: "showPopup",
          definitions: response.definitions,
        });
      })
      .catch((error) => {
        console.error("Error sending message to background script:", error);
      });
  }
});
