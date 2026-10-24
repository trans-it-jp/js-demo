# js/linear-algebra — matrices in homogeneous coordinates

[日本語](Readme.md)

2D coordinate transforms built from 3×3 matrices. No drawing, so the results can be checked against known values without a browser.

| File | Role |
| --- | --- |
| `matrix3.js` | Building, composing and applying matrices (`JsDemo.Matrix3`) |

## Conventions

Three assumptions run through this file. Check them before reading the code.

- A point is a **column vector** `v = [x, y, 1]^T`, and a matrix multiplies from the left: `v' = M·v`
- Applying a composition `M = A·B` gives `v' = A(Bv)`, so **the rightmost matrix acts first**
- A matrix is a **row-major** nested array: `[[r1c1, r1c2, r1c3], [...], [...]]`

Translation cannot be written as a 2×2 matrix, which is why these are 3×3 in homogeneous coordinates. The third row is always `[0, 0, 1]`: only affine transforms are covered, not projective ones.

## Loading

This file does not depend on `js/core`.

```html
<script src="../js/linear-algebra/matrix3.js"></script>
```

## Building matrices

```js
const M = JsDemo.Matrix3;

M.identity();              // identity
M.translation(3, -2);      // translation
M.scale(2, 0.5);           // scaling; a negative factor reflects
M.shear(0.5, 0);           // shear: x ← x + shx·y, y ← y + shy·x
M.rotation(Math.PI / 4);   // rotation about the origin (radians)
M.toRadians(45);           // degrees → radians
```

## Composing

`multiplyAll` multiplies left to right in the order given. On a point, the rightmost acts first.

```js
// "scale, then translate" as a single matrix
const combined = M.multiplyAll([ M.translation(3, 0), M.scale(2, 2) ]);
// the point sees scale, then translation
M.applyToPoint(combined, [1, 1]);   // [5, 2]
```

## Applying to points

```js
M.applyToPoint(combined, [1, 1]);          // one point
M.mapPoints(combined, [[0, 0], [1, 1]]);   // a list of points
```

## Rotation about an arbitrary point

Returns both the three factors and their product, so a page can show that this is `T(c)·R(θ)·T(−c)` rather than one opaque matrix.

```js
const result = M.rotationAbout(2, 1, M.toRadians(30));
result.parts;      // [{ key: "translateBack", M }, { key: "rotate", M }, { key: "translateToOrigin", M }]
result.combined;   // the product of the three
```

Each `key` matches a `matrix.*` entry in `js/ui/i18n.js`, so it can caption the factor in either language.

## For display

```js
M.round(matrix, 3);       // a new matrix rounded to 3 digits (-0 becomes 0)
M.determinant2(matrix);   // determinant of the top-left 2×2
```

`determinant2` is the factor by which area changes. A negative sign means orientation is flipped.

A rounded matrix is for display only; feeding it back into further calculation accumulates error.

## Checking the implementation

These hold against known values.

```js
M.applyToPoint(M.rotation(M.toRadians(90)), [1, 0]);   // about [0, 1]
M.determinant2(M.scale(2, 3));                         // 6
M.determinant2(M.rotation(1.2));                       // about 1 (rotation preserves area)
M.determinant2(M.scale(-1, 1));                        // -1 (reflection)
```

In floating point `Math.cos(Math.PI / 2)` is not exactly zero, so comparisons need a tolerance.
