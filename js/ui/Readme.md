# js/ui — 画面の操作と文言

[English](Readme.en.md)

入力部品のつなぎ込み、数値の表、日英の文言。ページごとの個別事情はここに入れず、各デモ側に置く。

| ファイル | 役割 |
| --- | --- |
| `i18n.js` | JavaScript が組み立てる文言の日英辞書（`JsDemo.I18n`） |
| `controls.js` | スライダーと数値入力の同期、モードボタン、状態表示（`JsDemo.Controls`） |
| `tables.js` | 行列や内訳を数値の表にする（`JsDemo.Tables`） |

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
