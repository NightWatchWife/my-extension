import { setupNotionIntegration } from "./notionIntegration.js";
import { adjustPopupSize } from "./utils.js";

// 特殊な文字列の宣言
const ENTRY_SEPARATOR = "||NEWENTRY||";

document.addEventListener("DOMContentLoaded", function () {
  // ポップアップのサイズを設定
  window.resizeTo(550, 850);

  const urlParams = new URLSearchParams(window.location.search);
  const word = urlParams.get("word");

  if (word) {
    // バックグラウンドスクリプトに単語の意味を検索するリクエストを送信
    chrome.runtime.sendMessage(
      {
        action: "searchWord",
        word: word,
      },
      function (response) {
        const definitionsContainer = document.getElementById("definitions");
        if (response && response.definitions.length > 0) {
          // 検索結果を表示
          definitionsContainer.innerHTML = "";
          response.definitions.forEach((definitionGroup, index) => {
            if (definitionGroup.descriptions) {
              definitionGroup.descriptions.forEach((desc, descIndex) => {
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.id = "def" + index + "_" + descIndex;
                const label = document.createElement("label");
                label.htmlFor = "def" + index + "_" + descIndex;
                label.textContent = `${definitionGroup.head} : ${desc}`;
                const div = document.createElement("div");
                div.className = "definition";
                div.appendChild(checkbox);
                div.appendChild(label);
                definitionsContainer.appendChild(div);
              });
            } else {
              console.error(
                `Invalid definition group at index ${index}:`,
                definitionGroup
              );
            }
          });

          // ポップアップのサイズを調整
          adjustPopupSize();
        } else {
          definitionsContainer.textContent = "No definitions found.";
          adjustPopupSize();
        }
      }
    );
  } else {
    document.getElementById("definitions").textContent = "No word selected.";
    adjustPopupSize();
  }

  // Notion連携ボタンの設定
  setupNotionIntegration(word);

  // 設定ボタンのクリックイベント
  document
    .getElementById("settingsButton")
    .addEventListener("click", function () {
      chrome.runtime.openOptionsPage();
    });
});
