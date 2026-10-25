# js/clustering — クラスタリング

[English](Readme.en.md)

k-means 法を「割当」と「中心の更新」の二段階に分けて 1 手ずつ進める。描画も DOM も扱わないので、ブラウザなしで既知値と照合できる。

| ファイル | 役割 |
| --- | --- |
| `kmeans.js` | k-means の状態機械と合成データ生成（`JsDemo.KMeans`） |

## 読み込み方

`js/core` の `JsDemo.Numeric` と `JsDemo.Random` を使う。先に読み込む。

```html
<script src="../js/core/seeded-random.js"></script>
<script src="../js/core/numeric.js"></script>
<script src="../js/clustering/kmeans.js"></script>
```

## 使い方

```js
const random = JsDemo.Random.create(1234);
const data = JsDemo.KMeans.makeBlobs({ random, count: 300, groups: 3, spread: 0.08 });

const model = JsDemo.KMeans.create({
  points: data.points,   // [[x, y], ...]
  k: 3,
  random,
  emptyClusterPolicy: "farthest",   // 既定
  tolerance: 1e-9
});

model.step();            // 1 手進める（割当 → 次は更新）
model.step();            // 1 手進める（更新 → 次は割当）
model.run(100);          // 収束するまで進める（上限つき）

model.centroids;         // [[x, y], ...]
model.assignments;       // 各点のクラスタ番号。-1 は未割当
model.phase;             // "assign" | "update" ＝ 次に行うこと
model.iteration;         // 更新を何回終えたか
model.converged;         // 収束したか
model.inertia();         // 各点から割当中心までの距離の2乗和
model.clusterSizes();    // クラスタごとの点の数
```

`step()` の戻り値は、いま何が起きたかを画面へ出すための情報。

```js
const info = model.step();
info.phase;           // いま実行した段階
info.nextPhase;       // 次に実行する段階
info.changed;         // 割当が変わった点の数（割当の段階のあと）
info.maxShift;        // 中心が動いた最大距離（更新の段階のあと）
info.emptyClusters;   // 空だったクラスタの番号
info.converged;
```

## 空クラスタの扱い

どの点も割り当てられない中心があると、クラスタの平均が `0 / 0` になる。素直に書くと中心が `NaN` になり、以後どの点にも最も近くならないため復帰せず、そのクラスタは消えたまま反復が続く。`k` を点の数より大きくしたときに起きやすい。

ここでは方針を選べるようにしてある。

| `emptyClusterPolicy` | 動き |
| --- | --- |
| `"farthest"`（既定） | 空になった中心を、割当中心から最も遠い点へ移す |
| `"keep"` | 空になった中心を動かさない（空のまま残る様子をそのまま見せる） |

どちらでも `NaN` にはならない。`k` が点の数を超える場合は、生成時に `k` を点の数へ合わせる。

## 収束の判定

2 回目以降の割当で 1 点も変わらなければ、もう中心も動かないので収束とする。更新の段階で中心の最大移動量が `tolerance` 未満かつ空クラスタがない場合も収束とする。

`run()` には上限がある。収束しない設定でも無限に回らない。

## 合成データ

```js
const data = JsDemo.KMeans.makeBlobs({
  random,
  count: 300,      // 点の数。ちょうどこの数を返す
  groups: 3,       // 塊の数。k とずらせる
  spread: 0.08,    // 塊の広がりの基準（塊ごとに前後する）
  noise: 0.06,     // どの塊にも属さない点の割合
  width: 1,
  height: 1
});
data.points;    // [[x, y], ...]  0〜1 の範囲。並び順は混ぜてある
data.centers;   // 塊の中心。k-means が見つけた中心と比べるため
```

**作り物に見えないようにしている。** 同じ大きさの真円が等間隔に並ぶと、人が置いた図に見えてしまう。塊ごとに次を変える。

| 変えるもの | 理由 |
| --- | --- |
| 広がり（縦横で別々）と向き | 真円が並ばないようにする |
| 含まれる点の数 | 完全に同数だと不自然 |
| 中心どうしの間隔 | 重なると別々の塊が 1 つに見える |

さらに、どの塊にも属さない点を少し混ぜる。範囲の外へ出た点は切り詰めずに取り直す。切り詰めると縁に点が並んで不自然になる。

`groups` と `k` をずらせるので、クラスタ数を人が決めることの影響を見せられる。

## モデルの限界

デモで扱うのはここまで。説明に書いておく必要がある。

- 距離はユークリッド距離。尺度の違う軸をそのまま混ぜると結果が歪む。
- 球状に近い塊を想定している。細長い分布や密度の違う分布には向かない。
- 初期値によって結果が変わる。種を変えて比べられるようにしてある。
- `k` は人が決める。データから自動では決まらない。
- 外れ値に引かれて中心が動く。

## 検証の手掛かり

```js
// 離れた 2 点、k=2 なら必ず 1 点ずつに分かれる
const m = JsDemo.KMeans.create({
  points: [[0, 0], [1, 1]], k: 2, random: JsDemo.Random.create(1)
});
m.run();
m.clusterSizes();   // [1, 1]
m.inertia();        // 0

// k が点の数を超える場合は k を点の数へ合わせる
JsDemo.KMeans.create({ points: [[0, 0]], k: 5, random }).k;   // 1
```

`inertia()` は反復のたびに減る（増えない）。増えていれば実装が壊れている。
