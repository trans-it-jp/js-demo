# js/sorting — sorting procedures

[日本語](Readme.md)

Twenty-five ways of sorting, each produced as a **list of steps** rather than a sorted array. Because the whole run is data, autoplay, single-stepping, rewinding and running several algorithms at once all come from one source. No drawing, no DOM — so the results can be checked without a browser.

| File | What it does |
| --- | --- |
| `sorts.js` | Step generation for 25 algorithms, and the fold that turns steps into a state (`JsDemo.Sorts`) |

## Loading it

It uses `JsDemo.Random` from `js/core`, both for the row and for the algorithms that shuffle. Load that first.

```html
<script src="../js/core/seeded-random.js"></script>
<script src="../js/sorting/sorts.js"></script>
```

## Using it

```js
const random = JsDemo.Random.create(1234);

// 1 to 24, each used once, in random order
const values = JsDemo.Sorts.values({ count: 24, random });

// Generate the steps. `values` is left alone
const plan = JsDemo.Sorts.run({ id: "quick", values, random });
plan.steps.length;   // how many steps
plan.finished;       // did it finish rather than hit the limit
plan.result;         // the array after every step is applied

// The state after n steps
const state = JsDemo.Sorts.replay({ values, steps: plan.steps, upTo: 10 });
state.main;          // [{ id, value, sorted, removed, mark }, ...]
state.counts;        // { compare, swap, write, remove, shuffle, check, reverse }

// Advance exactly one step (what autoplay uses; re-folding every frame costs
// time quadratic in the number of steps)
JsDemo.Sorts.applyStep(state, plan.steps[state.cursor]);
```

## The algorithms

`JsDemo.Sorts.ALGORITHMS` holds `{ id, group, maxCount, limit }`. `JsDemo.Sorts.byGroup(group)` returns one group.

| Group | ids |
| --- | --- |
| `exchange` | `bubble` `cocktail` `gnome` `comb` `pancake` |
| `insert` | `insertion` `binary` `shell` |
| `select` | `selection` `heap` `cycle` |
| `divide` | `merge` `quick` `stooge` |
| `distribute` (no comparisons) | `counting` `radix` `bucket` |
| `joke` | `stalin` `thanos` `bogo` `bozo` `quantum` `sleep` `miracle` `design` |

`maxCount` caps the number of elements — lowest for the ones that do not finish (`bogo` and `bozo` are capped at 7). `limit` caps the number of steps; going past it sets `truncated`.

`unbounded: true` marks the algorithms whose end cannot be known in advance (`bogo`, `bozo`, `miracle`). **It tells the UI not to show a total step count**: revealing which step it ends on would destroy the very property that there is no guarantee it ends.

## Step types

| type | Meaning | Fields |
| --- | --- | --- |
| `compare` | Two things were compared | `cells: [[row, i], ...]` |
| `read` | A value was read, not compared | `cells: [[row, i]]` |
| `swap` | Two things changed places | `i`, `j`, `row` (defaults to main) |
| `set` | A value was written | `row`, `i`, `value` |
| `reverse` | A range was flipped | `lo`, `hi` |
| `aux` | A working copy was laid out | `lo`, `hi`, `values` |
| `auxInit` | An empty working row was made | `size`, `kind`, `bounds` (divider positions) |
| `auxClear` | The working row was put away | — |
| `emit` | Something left for the output (not destroyed) | `i` |
| `remove` | Something was removed | `i` |
| `shuffle` | The whole row was reshuffled | `values` |
| `pivot` | A pivot was chosen | `i` |
| `range` | The range being worked on | `lo`, `hi` |
| `sorted` | A position is settled | `indices` |
| `check` | Sortedness was checked | `ok` |
| `note` | A short remark | `key` (an i18n key) |
| `done` | End of the run | — |

Comparisons and swaps are **counted from the steps**. Counting them separately would drift from what actually happened.

## Things to watch

- **The joke algorithms do not finish correctly.** `miracle` and `design` do not rearrange anything; `quantum` almost always ends "not sorted"; `stalin` and `thanos` destroy elements, so `plan.result.length` is shorter than the input.
- `JsDemo.Sorts.visibleValues(state)` drops both the destroyed (`removed`) and the departed (`departed`) cells from the main row and appends the output row when there is one. Check it with `isSorted()`.
- `removed` and `departed` are different things. Stalin and Thanos **destroy** (`removed`); sleep sort **moves** elements to the output (`departed`). Do not render them the same way.
- `sorted` means strictly "this position will not change again". It is not used for a stretch that is merely in order for now, as in insertion sort (there is an invariant test for this).
- `values()` uses **1 to n, each exactly once**. No value repeats, so stability (whether equal values keep their original order) cannot be demonstrated with this generator.
- `bogo` and `bozo` need a random source — pass `random` to `run`, or they will throw.
- Steps are generated up front, so the array grows with the number of elements. Do not call past `maxCount`.

## Checks

The cases live in `tests/cases.js`. All 25 algorithms are folded and checked against what is expected of them: that the row comes out sorted, or that elements were destroyed, or that nothing moved.

```
node tests/run.js
```

## Terms of reuse

Code under the [MIT License](../../LICENSE); these notes under [CC BY 4.0](../../LICENSE-CONTENT).
