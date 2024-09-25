import { processDictionary } from "./dictionaryProcessor.js";

document.addEventListener("DOMContentLoaded", function () {
  const apiKeyInput = document.getElementById("apiKey");
  const databaseIdInput = document.getElementById("databaseId");
  const saveButton = document.getElementById("saveButton");
  const dictionaryFileInput = document.getElementById("dictionaryFile");
  const uploadButton = document.getElementById("uploadButton");
  const progressBar = document.getElementById("progressBar");
  const dbProgressBar = document.getElementById("dbProgressBar");
  const fileNameDisplay = document.getElementById("fileNameDisplay");

  // 保存されたAPIキーとデータベースIDを読み込む
  chrome.storage.sync.get(
    ["notionApiKey", "notionDatabaseId"],
    function (items) {
      if (items.notionApiKey) {
        apiKeyInput.value = items.notionApiKey;
      }
      if (items.notionDatabaseId) {
        databaseIdInput.value = items.notionDatabaseId;
      }
    }
  );

  // 保存された辞書ファイル名を読み込む
  chrome.storage.local.get("dictionaryFileName", function (result) {
    if (result.dictionaryFileName) {
      fileNameDisplay.textContent = `取り込まれたファイル: ${result.dictionaryFileName}`;
    }
  });

  // 設定保存ボタンがクリックされたときの処理
  saveButton.addEventListener("click", function () {
    const notionApiKey = apiKeyInput.value;
    const notionDatabaseId = databaseIdInput.value;

    chrome.storage.sync.set(
      {
        notionApiKey: notionApiKey,
        notionDatabaseId: notionDatabaseId,
      },
      function () {
        alert("Notion設定が保存されました。");
      }
    );
  });

  // 辞書ファイル取り込みボタンがクリックされたときの処理
  uploadButton.addEventListener("click", function () {
    const file = dictionaryFileInput.files[0];
    if (file) {
      console.log("File selected:", file.name);
      chrome.storage.local.set({ dictionaryFileName: file.name });

      processDictionary(
        file,
        function (progress) {
          // プログレスバーの更新
          updateProgressBar(progressBar, progress);
        },
        function () {
          alert("辞書データが保存されました。");
          updateProgressBar(progressBar, 0); // 完了したらプログレスバーをリセット
        },
        function (progress) {
          // DB保存時のプログレスバー更新
          updateProgressBar(dbProgressBar, progress);
        }
      );
    } else {
      console.error("No file selected.");
    }
  });

  function updateProgressBar(progressBar, progress) {
    progressBar.style.width = `${progress.toFixed(2)}%`;
    progressBar.textContent = `Progress: ${progress.toFixed(2)}%`;
  }
});
