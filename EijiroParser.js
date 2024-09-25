// EijiroParser.js

// 定数の宣言
const HEADWORD_FIRST = "■"; // 見出し行の最初にあるべき文字
const DELIMITER1 = " : "; // 見出しと説明を区切るデリミタ
const SPECIAL_DELIMITERS = ["  {", "〔", " {"]; // 特殊なデリミタ
const GREEK_LETTERS_REGEX = /^[\u0370-\u03FF]+$/; // ギリシャ文字のUnicode範囲
const NON_ALPHANUMERIC_REGEX = /^[^\w\s]+$/; // アルファベットと数字以外の文字

// EijiroParserクラスの定義
class EijiroParser {
  constructor() {
    this.lines = []; // 現在の見出しに対応する説明の行を格納
    this.currentHead = undefined; // 現在の見出し
  }

  // 新しい行を追加してパースするメソッド
  addLine(line) {
    const hd = this.parseLine(line);
    if (hd === undefined) {
      return undefined;
    }

    // ギリシャ文字や記号のみの見出しをスキップ
    if (
      GREEK_LETTERS_REGEX.test(hd.head.trim()) ||
      NON_ALPHANUMERIC_REGEX.test(hd.head.trim())
    ) {
      return undefined;
    }

    const head = this.currentHead;
    const desc = this.lines.join("||NEWENTRY||"); // 特殊な文字列で説明を繋ぐ

    this.currentHead = hd.head;
    this.lines = [hd.desc];

    // パースされたエントリを返す
    if (head && desc) {
      return { head, desc };
    }
    return undefined;
  }

  // 行をパースするメソッド
  parseLine(line) {
    // 行が見出し行かどうかをチェック
    if (!line.startsWith(HEADWORD_FIRST)) {
      return undefined;
    }

    // デリミタの位置を見つける
    const dindex1 = line.indexOf(DELIMITER1);
    if (dindex1 <= 0) {
      return undefined;
    }

    // 見出しと説明を分割
    const firstHalf = line.substring(1, dindex1);
    const desc = line.substring(dindex1 + DELIMITER1.length);

    // 初期の結果
    let result = {
      head: firstHalf,
      desc: desc,
    };

    // 特殊なデリミタが含まれているかチェック
    for (let i = 0; i < SPECIAL_DELIMITERS.length; i++) {
      const delimiter = SPECIAL_DELIMITERS[i];
      const dindex2 = firstHalf.indexOf(delimiter);
      if (dindex2 >= 1) {
        result.head = firstHalf.substring(0, dindex2 + 1);
        result.desc = firstHalf.substring(dindex2 + delimiter.length) + desc;
        break;
      }
    }

    return result;
  }

  // 現在のバッファをフラッシュしてデータを返すメソッド
  flush() {
    const data = {};
    if (this.currentHead && this.lines.length >= 1) {
      data[this.currentHead] = this.lines.join("||NEWENTRY||"); // 特殊な文字列で説明を繋ぐ
    }
    this.currentHead = undefined;
    this.lines = [];
    return data;
  }
}

// EijiroParserクラスをエクスポート
export { EijiroParser };
