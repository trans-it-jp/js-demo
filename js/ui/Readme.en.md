# js/ui — controls and wording

[日本語](Readme.md)

Input wiring, numeric tables, and the Japanese and English wording. Anything specific to one page stays with that demo rather than here.

| File | Role |
| --- | --- |
| `i18n.js` | Japanese and English strings that JavaScript assembles (`JsDemo.I18n`) |
| `controls.js` | Slider/number-field pairing, mode buttons, status output (`JsDemo.Controls`) |
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
