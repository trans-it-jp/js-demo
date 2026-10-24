# js/viz — 描画

[English](Readme.en.md)

D3 で SVG を描く部品。計算は持たず、渡された値をそのまま図にする。

| ファイル | 役割 |
| --- | --- |
| `plane.js` | 座標平面。グリッド・軸・基底ベクトル・図形・描画ツール（`JsDemo.Plane`） |
| `scatter.js` | 散布図。点・中心・割当線（`JsDemo.Scatter`） |

## 読み込み方

d3 v7 が必要。`plane.js` は `JsDemo.Matrix3`、`scatter.js` は d3 の記号生成を使う。

```html
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
<script src="../js/linear-algebra/matrix3.js"></script>
<script src="../js/viz/plane.js"></script>
```

CDN の版は正確に固定する。`d3@7` のようなメジャー版指定だと、配信側の更新で挙動が変わりうる。

## 表示の決めごと

- 図は `viewBox` で組み、幅は CSS が決める。小画面でも拡大表示でも破綻しない。
- 内部座標は一辺 640 の正方形。x と y の縮尺を揃え、マスを正方形に保つ。
- 色は CSS 変数（`--series-1` など）を参照する。配色の変更は `css/site.css` 側で行う。
- 情報を色だけで伝えない。形・破線・番号・数値を併用する。

## JsDemo.Plane

```js
const plane = JsDemo.Plane.create({
  container: "#plot",        // セレクタか要素
  domain: [-10, 10],         // x も y もこの範囲
  labels: { figure: "座標平面の説明" }   // SVG の aria-label
});

plane.setMatrix(M);                  // 利用者が描いた図に使う現在の行列
plane.drawTransformedGrid(M);        // 変換後のグリッド
plane.drawShape(original, mapped);   // 元の図形（破線）と変換後（実線）
plane.drawBasis(M);                  // 基底ベクトル e₁ e₂ の像
plane.showPivot(cx, cy);             // 回転の中心
plane.hidePivot();

plane.setMode("line");               // "none" | "line" | "circle" | "rect" | "free"
plane.renderUserShapes(M);
plane.clearUserShapes();
plane.countUserShapes();
plane.house;                         // 既定の図形（家の形）
```

既定の図形は家の形。上下左右の区別がつくので、反転や回転が読み取れる。

描画は `pointerdown` / `pointermove` / `pointerup` で受けるので、マウス・タッチ・ペンのいずれでも動く。

### 既知の制約

図形の描画はポインタ操作だけで、キーボードからは行えない。パラメータはすべてスライダーと数値入力の両方で変えられるが、描画は代替手段がない。この点はアクセシビリティの未対応事項として扱う。

## JsDemo.Scatter

```js
const scatter = JsDemo.Scatter.create({
  container: "#plot",
  labels: { figure: "散布図の説明" }
});

scatter.render({
  points: [[x, y], ...],     // 0〜1 の範囲
  assignments: [0, 1, ...],  // クラスタ番号。-1 は未割当
  centroids: [[x, y], ...],
  showLinks: true            // 点と中心を結ぶ線
});
```

クラスタの区別は三つの手掛かりで示す。

| 手掛かり | 中身 |
| --- | --- |
| 色 | `--series-1`〜`--series-10`（Okabe–Ito をもとにした並び） |
| 形 | 円・四角・三角・菱形・十字・星・Y の 7 種を循環 |
| 番号 | 中心に 1 から始まる番号を表示 |

色と形が循環する周期が違う（10 と 7）ので、`k` が大きくても組み合わせで区別できる。未割当の点は中抜きの灰色の円。

凡例で同じ記号を使うときは `markerPath` を呼ぶ。

```js
JsDemo.Scatter.colorOf(0);        // "var(--series-1)"
JsDemo.Scatter.markerPath(0, 46); // SVG の path 文字列
```

## 決めごと

- このフォルダは計算をしない。クラスタの割当や行列の合成は呼び出し側で済ませる。
- `render` は毎回同じ結果を描く。前回の状態を内部に持たない（描画ツールの入力中だけ例外）。
