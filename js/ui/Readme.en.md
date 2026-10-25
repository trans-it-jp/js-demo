# js/ui — controls and wording

[日本語](Readme.md)

Input wiring, numeric tables, and the Japanese and English wording. Anything specific to one page stays with that demo rather than here.

| File | Role |
| --- | --- |
| `i18n.js` | Japanese and English strings that JavaScript assembles (`JsDemo.I18n`) |
| `controls.js` | Slider/number-field pairing, mode buttons, status output (`JsDemo.Controls`) |
| `learning.js` | Predictions, progressive hints, switchable wording (`JsDemo.Learning`) |
| `share-link.js` | Putting initial conditions in the URL so they can be shared (`JsDemo.ShareLink`) |
| `tables.js` | Matrices and breakdowns rendered as tables of numbers (`JsDemo.Tables`) |

## Loading

`controls.js` and `tables.js` use `JsDemo.Numeric`.

```html
<script src="../js/core/numeric.js"></script>
<script src="../js/ui/i18n.js"></script>
<script src="../js/ui/controls.js"></script>
<script src="../js/ui/tables.js"></script>
```

## JsDemo.I18n

The language comes from `<html lang>`: anything starting with `en` is English, everything else Japanese. There is no per-page dictionary to switch.

```js
JsDemo.I18n.t("phase.assign");    // on an English page: "Assign each point to its nearest centroid"
JsDemo.I18n.language;             // "ja" | "en"
```

**Text that can simply be written in the page belongs in the HTML.** Only strings that change with state go here. Moving headings and prose into the dictionary would mean you can no longer tell what a page says by reading it.

The key families:

| Prefix | Used for |
| --- | --- |
| `phase.` `status.` | The current step and the labels for readouts |
| `button.` | Button text |
| `table.` `matrix.` | Table and matrix captions |
| `figure.` | Figure `aria-label` text |
| `legend.` | Legends |
| `tool.` | Drawing tools |

The `matrix.*` keys match the `key` values returned by `JsDemo.Matrix3.rotationAbout()`.

## JsDemo.Controls

Pairs a slider with a number field. The ids follow one rule: `<name>` and `<name>-num`.

```html
<div class="control">
  <label class="control__label" for="scale-x">Scale along x</label>
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

Moving either control updates the other, and the value is clamped to `min` and `max` before it is returned. A half-typed field — empty, or just `-` — does not break the calculation.

**Nothing depends on dragging or on a slider alone.** Every value also has a number field, so the same value is reachable without fine pointer control and from the keyboard.

Mode buttons carry their state in `aria-pressed`.

```html
<div class="toolbar" id="draw-tools">
  <button type="button" data-mode="none">Off</button>
  <button type="button" data-mode="line">Line</button>
</div>
```

```js
JsDemo.Controls.bindModeButtons("draw-tools", "none", (mode) => plane.setMode(mode));
```

Status output, and announcements for assistive technology.

```js
JsDemo.Controls.renderReadout("readout", [
  { label: "Iteration", value: "3" },
  { label: "Current step", value: "Move the centroids" }
]);

JsDemo.Controls.announce("live", "Converged");   // into an element with aria-live="polite"
```

## JsDemo.ShareLink

Puts a page's initial conditions into the URL, so one starting state can be shared with a class.

```js
const SPEC = {
  seed:   { min: 0, max: 9999, integer: true, fallback: 42 },
  k:      { min: 1, max: 10,   integer: true, fallback: 3 }
};

JsDemo.ShareLink.read(SPEC);              // validated values from the current URL
JsDemo.ShareLink.sync(values, SPEC);      // rewrite the address bar (no new history entry)
JsDemo.ShareLink.currentUrl(values, SPEC);// the URL string to show in the share field

JsDemo.ShareLink.parse("?seed=7", SPEC);  // pure functions, verifiable from Node
JsDemo.ShareLink.build(values, SPEC);     // "?seed=7" (defaults are omitted)
```

**Numbers only.** No free-text field is accepted, so there is no way for personal data to end up in the URL. Names outside the spec are discarded.

**Every value read is checked.** Anyone can edit a URL, so out-of-range, empty and non-numeric values are pulled back to the range or the default by `Numeric.readNumber` before any calculation sees them.

**The range comes from the input elements.** Copying it into the spec lets the two drift, and a shared value then changes silently. `specFromControls` takes min, max, step and the initial value from the controls. `tools/check-controls.js` verifies that each slider and number field agree.

**Values snap to the control's step.** An angle field with a step of 1 cannot show 37.5, so `?deg=37.5` becomes 38 in `parse` rather than being left to the browser's own rounding — what is displayed and what the URL says then agree. Decimals are rounded to three places on the way into the URL, so `1.2000000000000002` never appears.

Wire the share field with `wireField` and `refreshField`, so both demos behave the same.

```js
ShareLink.wireField({ field: "share-url", button: "share-copy", status: "share-status" });
ShareLink.refreshField("share-url", values, spec);
```

## JsDemo.Learning

The mechanisms behind the learning flow: predictions, progressively revealed hints, and switchable wording.

```js
const prediction = JsDemo.Learning.wirePrediction({
  field: "predict", result: "predict-result"
});
prediction.chosen;                  // the chosen prediction, or null
prediction.reveal("what happened"); // shown only to someone who predicted
prediction.reset();                 // cleared when the data changes

const hints = JsDemo.Learning.wireHints("hints");   // one step at a time
hints.reset();

JsDemo.Learning.wireWording({ controls: "wording" }); // switch the wording
```

**Predicting is never required.** The demo works without it (decided 2026-10-25). Counting interactions is not a measure of understanding, and nobody should be stopped at the first move. Anyone who does predict gets the comparison afterwards — styled the same whether they were right or wrong, with no colour that scolds a miss.

**Folding uses `<details>`,** so it opens even without JavaScript.

**The number of wording levels is not fixed.** Add more `data-level` values to add more. How many are actually needed follows from the T02 learning design.

**Nothing about who chose what is stored or sent.** The state lives only in the page.

## JsDemo.Tables

Makes the content of a figure readable as numbers. It is the alternative for anyone who cannot follow the figure visually, and it is how a mismatch between the drawing and the calculation becomes visible.

```js
JsDemo.Tables.renderMatrix(el, M, "Linear transform L", 3);

JsDemo.Tables.renderMatrixList(el, [
  { caption: "Rotation R(θ)", M: R },
  { caption: "Translation T", M: T }
]);

JsDemo.Tables.renderTable(el, {
  caption: "Cluster breakdown",
  columns: ["Cluster", "Points", "Centroid x", "Centroid y"],
  rows: [["1", "102", "0.312", "0.447"]]
});
```

In `renderTable`, the first cell of each row becomes a row header (`th scope="row"`).
