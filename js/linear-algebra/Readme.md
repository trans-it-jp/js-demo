# js/linear-algebra — 同次座標の行列演算

[English](Readme.en.md)

3×3 行列による 2D 座標変換。描画は扱わないので、ブラウザなしで既知値と照合できる。

| ファイル | 役割 |
| --- | --- |
| `matrix3.js` | 行列の生成・合成・点への適用（`JsDemo.Matrix3`） |

## 約束ごと

この 3 点を前提に書かれている。読む前に確認してほしい。

- 点は**列ベクトル** `v = [x, y, 1]^T`。変換は左から掛ける: `v' = M·v`
- 合成 `M = A·B` を点に適用すると `v' = A(Bv)` なので、**右の行列が先に効く**
- 行列は**行優先**の二次元配列 `[[r1c1, r1c2, r1c3], [...], [...]]`

平行移動を 2×2 では書けないため、3×3 の同次座標を使う。3 行目は常に `[0, 0, 1]` で、アフィン変換だけを扱う（射影変換は対象外）。

## 読み込み方

`js/core` には依存しない。

```html
<script src="../js/linear-algebra/matrix3.js"></script>
```

## 行列を作る

```js
const M = JsDemo.Matrix3;

M.identity();              // 単位行列
M.translation(3, -2);      // 平行移動
M.scale(2, 0.5);           // 拡大縮小。負の値を与えると反転になる
M.shear(0.5, 0);           // せん断。x ← x + shx·y、y ← y + shy·x
M.rotation(Math.PI / 4);   // 原点中心の回転（ラジアン）
M.toRadians(45);           // 度 → ラジアン
```

## 合成する

`multiplyAll` は並びの順に左から掛ける。点に対しては右端が先に効く。

```js
// 「拡大してから平行移動」を 1 つの行列にする
const combined = M.multiplyAll([ M.translation(3, 0), M.scale(2, 2) ]);
// 点には scale → translation の順で効く
M.applyToPoint(combined, [1, 1]);   // [5, 2]
```

## 点に適用する

```js
M.applyToPoint(combined, [1, 1]);          // 1 点
M.mapPoints(combined, [[0, 0], [1, 1]]);   // 点列
```

## 任意点中心の回転

`T(c)·R(θ)·T(−c)` の 3 つの積であることを画面で示せるよう、成分と合成結果の両方を返す。

```js
const result = M.rotationAbout(2, 1, M.toRadians(30));
result.parts;      // [{ key: "translateBack", M }, { key: "rotate", M }, { key: "translateToOrigin", M }]
result.combined;   // 3 つを掛けた行列
```

`key` は `js/ui/i18n.js` の `matrix.*` と対応しているので、日英どちらの見出しにもそのまま使える。

## 表示用

```js
M.round(matrix, 3);       // 各要素を 3 桁へ丸めた新しい行列（-0 は 0 に直す）
M.determinant2(matrix);   // 左上 2×2 の行列式
```

`determinant2` は面積が何倍になるかを表す。符号が負なら向きが反転している。

丸めた行列は表示にだけ使う。次の計算へ渡すと誤差が積もる。

## 検証の手掛かり

既知値で照合できる。

```js
M.applyToPoint(M.rotation(M.toRadians(90)), [1, 0]);   // ほぼ [0, 1]
M.determinant2(M.scale(2, 3));                         // 6
M.determinant2(M.rotation(1.2));                       // ほぼ 1（回転は面積を変えない）
M.determinant2(M.scale(-1, 1));                        // -1（反転）
```

浮動小数の都合で `Math.cos(Math.PI / 2)` は厳密に 0 にならない。比較には許容誤差を置く。
