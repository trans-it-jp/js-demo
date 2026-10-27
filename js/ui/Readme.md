# js/ui — 画面の操作と文言

[English](Readme.en.md)

入力部品のつなぎ込み、数値の表、日英の文言。ページごとの個別事情はここに入れず、各デモ側に置く。

| ファイル | 役割 |
| --- | --- |
| `i18n.js` | JavaScript が組み立てる文言の日英辞書（`JsDemo.I18n`） |
| `controls.js` | スライダーと数値入力の同期、モードボタン、状態表示（`JsDemo.Controls`） |
| `learning.js` | 予想・段階的なヒント・語彙の切り替え（`JsDemo.Learning`） |
| `share-link.js` | 初期条件を URL へ載せて共有する（`JsDemo.ShareLink`） |
| `tables.js` | 行列や内訳を数値の表にする（`JsDemo.Tables`） |
| `catalog.js` | トップページの目録のまとめ直しと絞り込み（`JsDemo.Catalog`） |
| `catalog-page.js` | トップページから `catalog.js` を呼ぶだけの配線 |

## 読み込み方

`controls.js` と `tables.js` は `JsDemo.Numeric` を使う。

```html
<script src="../js/core/numeric.js"></script>
<script src="../js/ui/i18n.js"></script>
<script src="../js/ui/controls.js"></script>
<script src="../js/ui/tables.js"></script>
```

## JsDemo.I18n

言語は `<html lang>` から読む。`en` で始まれば英語、それ以外は日本語。ページごとに辞書を切り替える必要はない。

```js
JsDemo.I18n.t("phase.assign");    // 日本語ページなら「点を最も近い中心へ割り当てる」
JsDemo.I18n.language;             // "ja" | "en"

// 画面を作らずに辞書を点検するとき（日英の過不足を調べるなど）
JsDemo.I18n.setLanguage("en");    // 言語を明示して切り替える
JsDemo.I18n.detectLanguage();     // <html lang> から読み直す
```

**ページに固定で書ける文は HTML 側に置く。** ここに入れるのは状態によって変わる文字列だけ。見出しや説明文まで辞書に入れると、HTML を読んでも何が表示されるか分からなくなる。

鍵の系統は次のとおり。

| 接頭辞 | 用途 |
| --- | --- |
| `phase.` `status.` | いまの段階と数値の見出し |
| `button.` | ボタンの文字 |
| `table.` `matrix.` | 表と行列の見出し |
| `figure.` | 図の `aria-label` |
| `legend.` | 凡例 |
| `tool.` | 描画ツール |

`matrix.*` は `JsDemo.Matrix3.rotationAbout()` が返す `key` と対応している。

## JsDemo.Controls

スライダーと数値入力を組にする。id は `<name>` と `<name>-num` の規則で揃える。

```html
<div class="control">
  <label class="control__label" for="scale-x">x 方向の拡大</label>
  <input id="scale-x" type="range" min="-3" max="3" step="0.1" value="1">
  <input id="scale-x-num" type="number" min="-3" max="3" step="0.1" value="1">
</div>
```

```js
const pairs = JsDemo.Controls.bindPairs(["scale-x", "scale-y"], update);
JsDemo.Controls.readAll(pairs);     // { "scale-x": 1, "scale-y": 1 }
pairs["scale-x"].value();           // 1
pairs["scale-x"].set(2);
```

どちらを動かしてももう一方へ反映し、`min` と `max` に収めてから返す。入力途中の空欄や `-` だけの状態でも計算は壊れない。

**ドラッグやスライダーだけに頼らない。** 細かい操作が難しい場合やキーボードだけの場合でも同じ値に到達できるよう、数値入力を必ず対にする。

モードボタンは `aria-pressed` で状態を持つ。

```html
<div class="toolbar" id="draw-tools">
  <button type="button" data-mode="none">なし</button>
  <button type="button" data-mode="line">線</button>
</div>
```

```js
JsDemo.Controls.bindModeButtons("draw-tools", "none", (mode) => plane.setMode(mode));
```

状態表示と読み上げ向けの通知。

```js
JsDemo.Controls.renderReadout("readout", [
  { label: "反復", value: "3" },
  { label: "いまの段階", value: "中心を動かす" }
]);

JsDemo.Controls.announce("live", "収束しました");   // aria-live="polite" の要素へ
```

## JsDemo.ShareLink

画面の初期条件を URL へ載せ、授業で同じ状態を共有できるようにする。

```js
const SPEC = {
  seed:   { min: 0, max: 9999, integer: true, fallback: 42 },
  k:      { min: 1, max: 10,   integer: true, fallback: 3 }
};

JsDemo.ShareLink.read(SPEC);              // いまの URL から検査済みの値を読む
JsDemo.ShareLink.sync(values, SPEC);      // アドレス欄を書き換える（履歴は増やさない）
JsDemo.ShareLink.currentUrl(values, SPEC);// 共有欄に出す URL の文字列

JsDemo.ShareLink.parse("?seed=7", SPEC);  // 純粋な関数。Node からも検証できる
JsDemo.ShareLink.build(values, SPEC);     // "?seed=7"（既定値と同じものは省く）
```

**載せるのは数値だけ。** 自由入力の文字列を受け取らないので、個人情報が URL に入る余地がない。仕様に無い名前は捨てる。

**読んだ値は必ず検査する。** URL は誰でも書き換えられるので、範囲外・空欄・数でない値は `Numeric.readNumber` が範囲と既定値へ寄せる。そのまま計算へ渡さない。

**範囲は入力欄から読む。** 仕様に範囲を書き写すと画面と食い違い、共有した値が黙って変わる。`specFromControls` が min・max・step・初期値を入力欄から取る。`tools/check-controls.js` がスライダーと数値入力の一致を点検する。

**入力欄の刻みに合わせる。** 刻み 1 の角度欄に `?deg=37.5` を渡しても画面には 38 しか出せない。ブラウザの丸めに任せず `parse` で合わせ、表示と URL を一致させる。小数は URL へ出すときに 3 桁へ丸め、`1.2000000000000002` のような値が出ないようにする。

共有欄の配線は `wireField` と `refreshField` を使う。両デモで同じ作りになる。

```js
ShareLink.wireField({ field: "share-url", button: "share-copy", status: "share-status" });
ShareLink.refreshField("share-url", values, spec);
```

## JsDemo.Catalog

トップページの目録を**想定学年か分野でまとめ直し、前提概念で絞り込む**。

```js
JsDemo.Catalog.create({
  list: "catalog",          // カードが入っている <ul> の id
  controls: "catalog-modes",// 並べ方の切替を置く入れ物の id
  filter: "catalog-filter", // 絞り込みを置く入れ物の id（省略可）
  status: "catalog-status", // 件数を出す要素の id（省略可）
  initial: "stage"          // "stage"（想定学年）か "field"（分野）
});

JsDemo.Catalog.select(items, "coord");  // 純粋な関数。Node からも検証できる
JsDemo.Catalog.conceptsIn(items);       // 出現順・重複なしの概念の一覧
```

**HTML にはカードをふつうの一覧として書く。** JavaScript が動かないときはその一覧がそのまま読め、見出しも絞り込みも付かない。まとめ直すときもカードは作り直さず、置き場所を移すだけ。

カードが持つ属性は 2 つ。

| 属性 | 中身 |
| --- | --- |
| `data-stage` | 想定学年（`primary` / `lower` / `upper` / `adult`） |
| `data-concepts` | 前提概念の ID を空白で区切る（例: `coord mean distance`） |

分野は見出しの文言を辞書に持たず、カードに書いてある文字をそのまま使う。題材ごとに違う言葉を使うので、写すと二重管理になる。

**前提概念は絞り込みとして使い、見出しで群を作らない。** 公開3題では重なる概念が 1 つだけで、群にすると 1 件きりの群が並ぶため（決めごとは `planning/LEARNING-DESIGN.md` 9章）。

選んだ概念は URL に残る（`?concept=coord`）。URL は誰でも書き換えられるので、**カードに実際にある概念だけを受け取り、知らない値は捨てる。**


## JsDemo.Learning

学習の流れを支える仕掛け。予想・段階的なヒント・語彙の切り替え。

```js
const prediction = JsDemo.Learning.wirePrediction({
  field: "predict", result: "predict-result"
});
prediction.chosen;              // 選ばれた予想（選んでいなければ null）
prediction.reveal("実際の結果"); // 選んだ人にだけ答え合わせを出す
prediction.reset();             // 別のデータにしたときに消す

const hints = JsDemo.Learning.wireHints("hints");   // 1 段ずつ開く
hints.reset();

JsDemo.Learning.wireWording({ controls: "wording" }); // 語彙を出し分ける
```

**予想は強制しない。** 選ばなくても操作できる（代表者の判断、2026-10-25）。触った回数を理解度にしない方針と、最初の一手で詰まらせないため。そのかわり、選んだ人には結果との答え合わせを返す。合っていても外れても同じ見た目にし、外したことを責める配色にしない。

**折りたたみは `<details>` を使う。** JavaScript が動かなくても開ける。

**語彙の段階数は決め打ちしない。** `data-level` の値を増やせば増やせる。実際にいくつ要るかは【T02】学習設計の結果で決める。

**誰が何を選んだかは記録も送信もしない。** 状態は画面の中だけに持つ。

## JsDemo.Tables

図の内容を数値でも読めるようにする。図を目で追えない場合の代替であり、見た目と計算が食い違っていれば表で気づける。

```js
JsDemo.Tables.renderMatrix(el, M, "一次変換 L", 3);

JsDemo.Tables.renderMatrixList(el, [
  { caption: "回転 R(θ)", M: R },
  { caption: "平行移動 T", M: T }
]);

JsDemo.Tables.renderTable(el, {
  caption: "クラスタの内訳",
  columns: ["クラスタ", "点の数", "中心 x", "中心 y"],
  rows: [["1", "102", "0.312", "0.447"]]
});
```

`renderTable` の各行の 1 列目は行見出し（`th scope="row"`）として扱う。
