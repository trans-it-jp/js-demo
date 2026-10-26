# js/sorting — ソートの手順

[English](Readme.en.md)

25 種類の並べ替えを「手順（step）の列」として作る。並べ替えた結果ではなく**途中の全部**を配列で返すので、自動再生・1 手ずつ・巻き戻し・同時実行を 1 つの出どころから作れる。描画も DOM も扱わないので、ブラウザなしで結果を照合できる。

| ファイル | 役割 |
| --- | --- |
| `sorts.js` | 25 手法の手順生成と、手順を状態へ畳み込む仕組み（`JsDemo.Sorts`） |

## 読み込み方

`js/core` の `JsDemo.Random` を使う（並びを作るときと、混ぜ直す手法のため）。先に読み込む。

```html
<script src="../js/core/seeded-random.js"></script>
<script src="../js/sorting/sorts.js"></script>
```

## 使い方

```js
const random = JsDemo.Random.create(1234);

// 1 から 24 までを 1 回ずつ使った、順番だけばらばらの並び
const values = JsDemo.Sorts.values({ count: 24, random });

// 手順を作る。values は変えない
const plan = JsDemo.Sorts.run({ id: "quick", values, random });
plan.steps.length;   // 手順の数
plan.finished;       // 上限で打ち切らずに終わったか
plan.result;         // 手順を全部適用したあとの配列

// n 手目の状態
const state = JsDemo.Sorts.replay({ values, steps: plan.steps, upTo: 10 });
state.main;          // [{ id, value, sorted, removed, mark }, ...]
state.counts;        // { compare, swap, write, remove, shuffle, check, reverse }

// 1 手だけ進める（自動再生はこちら。毎回畳み込むと手順の数の 2 乗だけ時間がかかる）
JsDemo.Sorts.applyStep(state, plan.steps[state.cursor]);
```

## 手法の一覧

`JsDemo.Sorts.ALGORITHMS` に `{ id, group, maxCount, limit }` が並ぶ。`JsDemo.Sorts.byGroup(group)` で分類ごとに取り出せる。

| 分類 | id |
| --- | --- |
| `exchange` 交換 | `bubble` `cocktail` `gnome` `comb` `pancake` |
| `insert` 挿入 | `insertion` `binary` `shell` |
| `select` 選択 | `selection` `heap` `cycle` |
| `divide` 分割統治 | `merge` `quick` `stooge` |
| `distribute` 比べない | `counting` `radix` `bucket` |
| `joke` 冗談 | `stalin` `thanos` `bogo` `bozo` `quantum` `sleep` `miracle` `design` |

`maxCount` は要素数の上限。終わらない手法ほど小さい（`bogo` と `bozo` は 7）。`limit` は手順の上限で、超えると `truncated` が立つ。

## 手順の種類

| type | 内容 | 持ち物 |
| --- | --- | --- |
| `compare` | 比べた | `cells: [[row, i], ...]` |
| `swap` | 入れ替えた | `i`, `j`, `row`（既定 main） |
| `set` | 値を書いた | `row`, `i`, `value` |
| `reverse` | 範囲をひっくり返した | `lo`, `hi` |
| `aux` | 控えを並べた | `lo`, `hi`, `values` |
| `auxInit` | 控えを空で用意した | `size`, `kind` |
| `auxClear` | 控えを片付けた | — |
| `emit` | 出力へ送った | `i` |
| `remove` | 取り除いた | `i` |
| `shuffle` | 混ぜ直した | `values` |
| `pivot` | 基準を決めた | `i` |
| `range` | 見ている範囲 | `lo`, `hi` |
| `sorted` | 位置が確定した | `indices` |
| `check` | そろっているか見た | `ok` |
| `note` | 短い説明 | `key`（i18n の鍵） |
| `done` | 手順の終わり | — |

比べた回数・入れ替えた回数は**手順から数える**。別に数えると実物とずれるため。

## 気をつけること

- **冗談の手法は正しく終わらない。** `miracle` と `design` は並べ替えない。`quantum` はたいてい「そろっていない」で終わる。`stalin` と `thanos` は要素が消えるので、`plan.result.length` が元より短くなる。
- `JsDemo.Sorts.visibleValues(state)` は、取り除かれたものを除いた並びを返す。`isSorted()` と組み合わせて確かめる。
- `values()` は **1 から n までを 1 回ずつ**使う。同じ値は出てこないので、安定性（同じ値の前後関係が保たれるか）はこの作りでは確かめられない。
- `bogo` と `bozo` は乱数が要る（`run` に `random` を渡す）。渡さないと落ちる。
- 手順は先に全部作る。要素数を大きくすると配列も大きくなるので、`maxCount` を超えて呼ばない。

## 検証

`tests/cases.js` に入れてある。25 手法すべてについて、手順を畳み込んだ結果が期待どおりか（そろうか、要素が減るか、動かないか）を照合する。

```
node tests/run.js
```

## 再利用条件

コードは [MIT License](../../LICENSE)、解説は [CC BY 4.0](../../LICENSE-CONTENT)。
