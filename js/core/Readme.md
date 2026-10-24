# js/core — 基盤

[English](Readme.en.md)

描画も DOM も扱わない土台。乱数と数値の整形だけを担う。他のどのフォルダからも使う。

| ファイル | 役割 |
| --- | --- |
| `seeded-random.js` | 種を指定できる疑似乱数（`JsDemo.Random`） |
| `numeric.js` | 丸め・範囲制限・入力値の正規化・距離（`JsDemo.Numeric`） |

## 読み込み方

`JsDemo` という名前の 1 つのオブジェクトに登録していく。依存はないので最初に読み込む。

```html
<script src="../js/core/seeded-random.js"></script>
<script src="../js/core/numeric.js"></script>
```

## JsDemo.Random

`Math.random()` は再現できないため、デモの初期データ生成には使わない。同じ種なら必ず同じ列になるので、授業で同じ初期状態を共有でき、テストの期待値も固定できる。

```js
const random = JsDemo.Random.create(20261025);   // 数値でも文字列でも種にできる

random.next();              // [0, 1) の実数
random.range(-10, 10);      // [-10, 10) の実数
random.int(2, 10);          // [2, 10] の整数
random.pick(["a", "b"]);    // 配列から 1 つ
random.shuffle([1, 2, 3]);  // 並べ替えた複製（元の配列は変えない）
random.normal(0, 0.1);      // 平均 0・標準偏差 0.1 の正規乱数
random.seed;                // 実際に使われた種（32bit 整数）
random.reset();             // 同じ種の先頭へ戻す
```

```js
// 同じ種なら同じ結果になることの確認
const a = JsDemo.Random.create("demo");
const b = JsDemo.Random.create("demo");
a.next() === b.next();   // true
```

## JsDemo.Numeric

入力欄から来る値は文字列で、空欄・全角数字・範囲外もありうる。計算へ渡す前にここで必ず有限な数へ直す。

```js
const N = JsDemo.Numeric;

N.round(3.14159, 2);        // 3.14
N.clamp(12, 0, 10);         // 10
N.toFinite("１２.５", 0);    // 12.5   全角数字と全角マイナスも受け付ける
N.toFinite("", 1);          // 1      数にできなければ既定値
N.readNumber("99", { min: 2, max: 10, integer: true });  // 10

N.format(1 / 3);            // "0.333"  桁を揃える（表の列に使う）
N.formatShort(2.0);         // "2"      余分な 0 を落とす（見出しに使う）

N.distance([0, 0], [3, 4]);         // 5
N.distanceSquared([0, 0], [3, 4]);  // 25   比較だけなら平方根を取らない
N.mean([1, 2, 3]);                  // 2    空配列では null（0 と区別する）
```

## 決めごと

- `Number.isFinite` を通らない値を計算へ渡さない。`NaN` は図を黙って壊すため。
- 平均は空配列で `null` を返す。`0` を返すと「要素がない」と「合計が 0」を区別できない。
- 丸めは表示のときだけ行う。丸めた値を次の計算へ渡さない。
