import { EijiroParser } from "./EijiroParser.js";

// 特殊なエントリセパレータを宣言
// このセパレータは、同じ見出し語の複数の説明を区別するために使用されます。
const ENTRY_SEPARATOR = "||NEWENTRY||";

/**
 * プログレスバーの表示を更新する関数
 * @param {HTMLElement} progressBar - プログレスバー要素
 * @param {number} progress - 現在の進捗状況（0〜100）
 */
function updateProgressBar(progressBar, progress) {
  progressBar.style.width = `${progress.toFixed(2)}%`;
  progressBar.textContent = `Progress: ${progress.toFixed(2)}%`;
}

/**
 * 辞書ファイルを処理して、IndexedDBに保存するメイン関数
 * @param {File} file - ユーザーがアップロードした辞書ファイル
 * @param {Function} progressCallback - 辞書ファイルの処理進捗を更新するためのコールバック
 * @param {Function} completionCallback - 処理が完了したときに呼ばれるコールバック
 * @param {Function} dbProgressCallback - DBへの保存進捗を更新するためのコールバック
 */
async function processDictionary(
  file,
  progressCallback,
  completionCallback,
  dbProgressCallback
) {
  const reader = new FileReader();

  // ファイル読み込み完了時に実行される処理
  reader.onload = async function (e) {
    const text = e.target.result; // 読み込まれたファイルの内容を取得
    const parser = new EijiroParser(); // EijiroParserクラスのインスタンスを作成
    const lines = text.split("\n"); // ファイルを行ごとに分割
    const totalLines = lines.length; // 全行数を取得

    console.log(`Total lines read: ${totalLines}`);

    let dictionaryData = {}; // 辞書データを格納するオブジェクト

    // ファイルの各行を処理
    for (let index = 0; index < totalLines; index++) {
      const line = lines[index];
      const parsed = parser.addLine(line);

      // パースされたエントリを辞書データに追加
      if (parsed) {
        if (dictionaryData[parsed.head]) {
          // 同じ見出し語が既に存在する場合は、説明を追加
          dictionaryData[parsed.head] += ENTRY_SEPARATOR + parsed.desc;
        } else {
          // 新しい見出し語の場合は、新規に追加
          dictionaryData[parsed.head] = parsed.desc;
        }
      }

      // プログレスバーを更新（100行ごとに更新）
      if (index % 100 === 0) {
        const progress = (index / totalLines) * 100;
        progressCallback(progress);
        await new Promise((resolve) => setTimeout(resolve, 0)); // メインスレッドをブロックしないように一時停止
      }
    }

    // 最後の未フラッシュデータを追加
    const remainingData = parser.flush();
    dictionaryData = { ...dictionaryData, ...remainingData };
    console.log("Finished processing lines.");

    // IndexedDBに辞書データを保存
    const request = indexedDB.open("DictionaryDB", 1);

    // データベースのバージョンアップが必要な場合に呼ばれる処理
    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("dictionary")) {
        // データベースがまだ存在しない場合、新しく作成
        const objectStore = db.createObjectStore("dictionary", {
          keyPath: "head",
        });
        objectStore.createIndex("head", "head", { unique: true });
      }
    };

    // データベースが正常に開かれた場合に呼ばれる処理
    request.onsuccess = function (event) {
      const db = event.target.result;
      // データをIndexedDBに保存
      saveToIndexedDB(db, dictionaryData, dbProgressCallback)
        .then(() => {
          console.log("Dictionary data saved to IndexedDB");
          completionCallback(); // 処理完了コールバックを呼び出し
        })
        .catch((error) => {
          console.error("Error saving dictionary data to IndexedDB:", error);
        });
    };

    // データベースが開けなかった場合に呼ばれる処理
    request.onerror = function (event) {
      console.error("Error opening IndexedDB:", event.target.error);
    };
  };

  // ファイルをShift_JISエンコーディングで読み込む
  reader.readAsText(file, "shift_jis");
}

/**
 * 辞書データをIndexedDBに保存する関数
 * @param {IDBDatabase} db - IndexedDBデータベースインスタンス
 * @param {Object} dictionaryData - 辞書データを含むオブジェクト
 * @param {Function} progressCallback - 保存進捗を更新するためのコールバック
 * @returns {Promise} データ保存のPromise
 */
function saveToIndexedDB(db, dictionaryData, progressCallback) {
  return new Promise((resolve, reject) => {
    // "||NEWENTRY||" を含むエントリを1つのエントリとしてカウント
    const totalEntries = Object.values(dictionaryData).reduce((count, desc) => {
      return count + (desc.split("||NEWENTRY||").length - 1);
    }, 0);

    let processedEntries = 0; // 処理済みエントリのカウンタ
    const chunkSize = 4000; // トランザクションのサイズを4000件に設定
    const logInterval = 100; // 100件ごとに進捗をコンソールに出力
    console.log(`Debug: totalEntries = ${totalEntries}`);

    /**
     * トランザクションを作成し、指定されたチャンクデータを保存する関数
     * @param {Object} chunkData - 現在のチャンクに含まれるデータ
     */
    function saveChunk(chunkData) {
      const transaction = db.transaction(["dictionary"], "readwrite"); // 読み書き可能なトランザクションを開始
      const objectStore = transaction.objectStore("dictionary");

      // トランザクションが完了した時に呼ばれる処理
      transaction.oncomplete = function () {
        processedEntries += Object.values(chunkData).reduce((count, desc) => {
          return count + desc.split(ENTRY_SEPARATOR).length;
        }, 0); // 処理済みエントリを更新
        const progress = (processedEntries / totalEntries) * 100; // 進捗を計算
        progressCallback(progress); // 進捗コールバックを呼び出し

        // 100件ごとに処理の進捗をコンソールに出力
        if (processedEntries % logInterval === 0) {
          console.log(`Processed ${processedEntries}/${totalEntries} entries.`);
        }

        if (processedEntries < totalEntries) {
          saveNextChunk(); // 次のチャンクを保存
        } else {
          resolve(); // 全エントリの保存が完了したらPromiseを解決
        }
      };

      // トランザクションでエラーが発生した時に呼ばれる処理
      transaction.onerror = function (event) {
        console.error("Transaction error:", event.target.error); // エラーメッセージをコンソールに出力
        reject(event.target.error); // エラーが発生したらPromiseをリジェクト
      };

      // 現在のチャンクの各エントリを保存
      for (const [head, desc] of Object.entries(chunkData)) {
        objectStore.put({ head, desc }).onsuccess = function () {};
      }
    }

    /**
     * 次のチャンクを取得し、保存する関数
     */
    function saveNextChunk() {
      const chunkData = {}; // 新しいチャンクデータを作成
      const entries = Object.entries(dictionaryData).slice(
        processedEntries,
        processedEntries + chunkSize
      ); // 次のチャンクを取得

      if (entries.length === 0) {
        resolve(); // チャンクが空の場合、処理を終了
        return;
      }

      for (const [head, desc] of entries) {
        chunkData[head] = desc; // チャンクデータに追加
        delete dictionaryData[head]; // メモリを節約するために、保存済みのデータを削除
      }

      saveChunk(chunkData); // 現在のチャンクを保存
    }

    saveNextChunk(); // 初回のチャンク保存を開始
  });
}

// このモジュールからエクスポートする関数
export { processDictionary };
