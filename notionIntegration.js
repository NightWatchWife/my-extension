// notionIntegration.js

export function setupNotionIntegration(word) {
  document
    .getElementById("notionButton")
    .addEventListener("click", function () {
      // 保存されたAPIキーとデータベースIDを取得
      chrome.storage.sync.get(
        ["notionApiKey", "notionDatabaseId"],
        function (items) {
          const NOTION_API_KEY = items.notionApiKey;
          const DATABASE_ID = items.notionDatabaseId;

          if (!NOTION_API_KEY || !DATABASE_ID) {
            alert("Notion APIキーとデータベースIDを設定してください。");
            return;
          }

          const url = "https://api.notion.com/v1/pages";

          const headers = {
            "Notion-Version": "2022-06-28",
            Authorization: `Bearer ${NOTION_API_KEY}`,
            "Content-Type": "application/json",
          };

          const selectedDefinitions = [];
          const checkboxes = document.querySelectorAll(
            '#definitions input[type="checkbox"]:checked'
          );
          checkboxes.forEach((checkbox) => {
            const label = document.querySelector(`label[for="${checkbox.id}"]`);
            selectedDefinitions.push(label.textContent);
          });

          if (selectedDefinitions.length === 0) {
            alert("少なくとも1つの定義を選択してください。");
            return;
          }

          const json_data = {
            parent: { database_id: DATABASE_ID },
            properties: {
              Word: {
                title: [
                  {
                    text: {
                      content: word,
                    },
                  },
                ],
              },
              Definition: {
                rich_text: selectedDefinitions.map((def) => ({
                  text: {
                    content: def,
                  },
                })),
              },
              "Part of Speech": {
                rich_text: [
                  {
                    text: {
                      content: "Noun", // ここは適宜変更してください
                    },
                  },
                ],
              },
              "Registration Date": {
                date: {
                  start: new Date().toISOString(),
                },
              },
            },
          };

          fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(json_data),
          })
            .then((response) => {
              if (!response.ok) {
                return response.json().then((errorData) => {
                  throw new Error(
                    `Error from Notion API: ${errorData.message}`
                  );
                });
              }
              return response.json();
            })
            .then((data) => {
              const successMessage = document.createElement("div");
              successMessage.textContent = "Notionに送信されました。";
              successMessage.style.position = "fixed";
              successMessage.style.top = "50%";
              successMessage.style.left = "50%";
              successMessage.style.transform = "translate(-50%, -50%)";
              successMessage.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
              successMessage.style.color = "white";
              successMessage.style.padding = "20px";
              successMessage.style.borderRadius = "5px";
              document.body.appendChild(successMessage);

              setTimeout(() => {
                document.body.removeChild(successMessage);
              }, 3000); // 3秒後にメッセージを非表示にする
            })
            .catch((error) => {
              const errorMessage = document.createElement("div");
              errorMessage.textContent = "Notionへの送信に失敗しました。";
              errorMessage.style.position = "fixed";
              errorMessage.style.top = "50%";
              errorMessage.style.left = "50%";
              errorMessage.style.transform = "translate(-50%, -50%)";
              errorMessage.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
              errorMessage.style.color = "white";
              errorMessage.style.padding = "20px";
              errorMessage.style.borderRadius = "5px";
              document.body.appendChild(errorMessage);

              setTimeout(() => {
                document.body.removeChild(errorMessage);
              }, 3000); // 3秒後にメッセージを非表示にする
            });
        }
      );
    });
}
