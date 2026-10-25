# js/viz — drawing

[日本語](Readme.md)

SVG drawing components built on D3. They hold no mathematics: they render the values they are handed.

| File | Role |
| --- | --- |
| `plane.js` | Coordinate plane: grid, axes, basis vectors, shapes, drawing tools (`JsDemo.Plane`) |
| `scatter.js` | Scatter plot: points, centroids, assignment links (`JsDemo.Scatter`) |

## Loading

D3 v7 is required. `plane.js` uses `JsDemo.Matrix3`; `scatter.js` uses D3's symbol generators.

```html
<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
<script src="../js/linear-algebra/matrix3.js"></script>
<script src="../js/viz/plane.js"></script>
```

CDN versions are pinned exactly. A major-version specifier such as `d3@7` lets the delivered code change under you.

## Display conventions

- Figures use `viewBox`, and CSS decides the width, so they survive small screens and zoom.
- The internal coordinate space is a 640-unit square. x and y share one scale, keeping cells square.
- Colours come from CSS custom properties (`--series-1` and so on). Change the palette in `css/site.css`.
- No information is carried by colour alone. Shape, dashes, numbers and figures carry it too.

## JsDemo.Plane

```js
const plane = JsDemo.Plane.create({
  container: "#plot",        // selector or element
  domain: [-10, 10],         // the range for both x and y
  labels: { figure: "Description of the plane" }   // the SVG aria-label
});

plane.setMatrix(M);                  // the current matrix, used for shapes people draw
plane.drawTransformedGrid(M);        // the transformed grid
plane.drawShape(original, mapped);   // original shape (dashed) and transformed (solid)
plane.drawBasis(M);                  // images of the basis vectors e₁ and e₂
plane.showPivot(cx, cy);             // the centre of rotation
plane.hidePivot();

plane.setMode("line");               // "none" | "line" | "circle" | "rect" | "free"
plane.renderUserShapes(M);
plane.clearUserShapes();
plane.countUserShapes();
plane.house;                         // the default shape (a house outline)
```

The default shape is a house outline: it has a distinguishable top, bottom, left and right, so reflections and rotations can be read off it.

Drawing is wired to `pointerdown` / `pointermove` / `pointerup`, so mouse, touch and pen all work.

### Known limitation

Shapes can only be drawn with a pointer; there is no keyboard path for drawing. Every numeric parameter can be changed with either a slider or a number field, but drawing has no equivalent. This is recorded as an outstanding accessibility gap rather than treated as covered.

## JsDemo.Scatter

```js
const scatter = JsDemo.Scatter.create({
  container: "#plot",
  labels: { figure: "Description of the scatter plot" }
});

scatter.render({
  points: [[x, y], ...],     // within 0–1
  assignments: [0, 1, ...],  // cluster index; -1 means unassigned
  centroids: [[x, y], ...],
  showLinks: true,           // draw a line from each point to its centroid
  animate: true              // move from the previous state
});
```

With `animate`, **the centroids and the assignment links** move over 650ms, so you can follow where the centroids drift and which centroid each point was handed to.

**A point's appearance — colour and shape — changes instantly.** Fading the colour would pass through a shade belonging to no cluster, while the shape snaps, so for a moment the marker would contradict itself. The point commits to its cluster at once; where it moved is told by the link.

When `prefers-reduced-motion: reduce` is set, nothing moves even with `animate` true.

Clusters are distinguished three ways at once.

| Cue | What it is |
| --- | --- |
| Colour | `--series-1` to `--series-10`, an order based on Okabe–Ito |
| Shape | Circle, square, triangle, diamond, cross, star, wye — seven, cycled |
| Number | Each centroid is labelled from 1 |

Colour and shape cycle at different periods (10 and 7), so combinations stay distinct even for larger `k`. Unassigned points are hollow grey circles.

To reuse the same markers in a legend, call `markerPath`.

```js
JsDemo.Scatter.colorOf(0);        // "var(--series-1)"
JsDemo.Scatter.markerPath(0, 46); // an SVG path string
```

## Conventions

- This folder performs no calculation. Cluster assignment and matrix composition happen in the caller.
- `render` draws the same output for the same input; it keeps no state between calls (the drawing tools' in-progress shape is the one exception).
