# js/clustering — clustering

[日本語](Readme.md)

k-means, split into an assignment step and a centroid-update step that advance one at a time. No drawing and no DOM, so the results can be checked against known values without a browser.

| File | Role |
| --- | --- |
| `kmeans.js` | The k-means state machine and a synthetic data generator (`JsDemo.KMeans`) |

## Loading

This file uses `JsDemo.Numeric` and `JsDemo.Random` from `js/core`, so load those first.

```html
<script src="../js/core/seeded-random.js"></script>
<script src="../js/core/numeric.js"></script>
<script src="../js/clustering/kmeans.js"></script>
```

## Usage

```js
const random = JsDemo.Random.create(1234);
const data = JsDemo.KMeans.makeBlobs({ random, count: 300, groups: 3, spread: 0.08 });

const model = JsDemo.KMeans.create({
  points: data.points,   // [[x, y], ...]
  k: 3,
  random,
  emptyClusterPolicy: "farthest",   // the default
  tolerance: 1e-9
});

model.step();            // one step (assign; update comes next)
model.step();            // one step (update; assign comes next)
model.run(100);          // run to convergence, with a ceiling

model.centroids;         // [[x, y], ...]
model.assignments;       // cluster index per point; -1 means unassigned
model.phase;             // "assign" | "update" — what the next step will do
model.iteration;         // how many update steps have finished
model.converged;         // whether it has converged
model.inertia();         // sum of squared distances from each point to its centroid
model.clusterSizes();    // number of points per cluster
```

`step()` returns what just happened, for the page to display.

```js
const info = model.step();
info.phase;           // the step that just ran
info.nextPhase;       // the step that will run next
info.changed;         // points that changed cluster (after an assign step)
info.maxShift;        // largest distance a centroid moved (after an update step)
info.emptyClusters;   // indices of clusters that were empty
info.converged;
```

## Empty clusters

If no point is assigned to some centroid, that cluster's mean is `0 / 0`. Written naively the centroid becomes `NaN`; it is then nearest to no point, never recovers, and the cluster stays gone while the iteration continues. This happens readily when `k` is large relative to the number of points.

The behaviour is selectable.

| `emptyClusterPolicy` | What it does |
| --- | --- |
| `"farthest"` (default) | Moves the empty centroid to the point farthest from its own centroid |
| `"keep"` | Leaves the empty centroid where it is, so the empty cluster stays visible |

Neither produces `NaN`. If `k` exceeds the number of points, `k` is reduced to the number of points at construction.

## Convergence

After the first iteration, an assignment step that moves no point means no centroid can move either, so that counts as converged. An update step also converges when the largest centroid move is below `tolerance` and no cluster was empty.

`run()` takes a ceiling, so a configuration that never settles still terminates.

## Synthetic data

```js
const data = JsDemo.KMeans.makeBlobs({
  random,
  count: 300,      // number of points; exactly this many come back
  groups: 3,       // number of blobs; may differ from k
  spread: 0.08,    // baseline spread; each blob varies around it
  noise: 0.06,     // fraction of points belonging to no blob
  width: 1,
  height: 1
});
data.points;    // [[x, y], ...] within 0–1, in shuffled order
data.centers;   // the blob centres, to compare against what k-means finds
```

**It is built not to look manufactured.** Identical circles at even spacing read as a diagram someone drew. Each blob differs in:

| What varies | Why |
| --- | --- |
| Spread (separately in x and y) and orientation | So no two blobs are the same circle |
| How many points it holds | Exactly equal counts look unnatural |
| Distance from the other centres | Overlapping centres make two blobs look like one |

A few points belong to no blob at all. A point falling outside the field is resampled rather than clamped: clamping lines points up along the edge.

Because `groups` and `k` are independent, a page can show what follows from a person choosing the number of clusters.

## Limits of the model

This is as far as the demo goes, and the page says so.

- Distance is Euclidean. Mixing axes with different units distorts the result.
- Roughly round blobs are assumed. Elongated or unevenly dense distributions do not suit it.
- The result depends on the initial centroids. Changing the seed lets you compare.
- `k` is chosen by a person; it does not follow from the data.
- Outliers pull centroids towards them.

## Checking the implementation

```js
// Two distant points with k=2 must split one and one
const m = JsDemo.KMeans.create({
  points: [[0, 0], [1, 1]], k: 2, random: JsDemo.Random.create(1)
});
m.run();
m.clusterSizes();   // [1, 1]
m.inertia();        // 0

// k above the number of points is reduced to the number of points
JsDemo.KMeans.create({ points: [[0, 0]], k: 5, random }).k;   // 1
```

`inertia()` decreases (never increases) from one iteration to the next. If it rises, the implementation is broken.
