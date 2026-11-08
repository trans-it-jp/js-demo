# js/fraction — comparing fractions on the same whole

[日本語](Readme.md)

Builds the steps for comparing two fractions on the same whole. Nothing here touches the DOM or d3, so the results can be verified from Node.

| File | Role |
| --- | --- |
| `compare.js` | Common denominators, comparison and the list of steps (`JsDemo.Fraction`) |

## Loading

It uses `JsDemo.Numeric`.

```html
<script src="../js/core/numeric.js"></script>
<script src="../js/fraction/compare.js"></script>
```

## Decisions

- **Only fractions between 0 and 1.** The numerator never exceeds the denominator. Improper fractions, mixed numbers, negative fractions, arithmetic and practice at reducing are out of scope for the first version.
- **The matching step is always taken.** The six steps are divide, fill, divide, fill, cut to match, count — there is no path that compares two fractions without first making the cuts match.
- **The whole never changes.** Both squares on screen are always the same size; there is no control for comparing different wholes.
- **Nothing is reduced to lowest terms.** The point is that matching the cuts makes the pieces countable, not the reduction procedure. 1/2 and 2/4 come out as **the same area**.
- Denominators go up to 12; finer than that and the difference in area stops being visible.
- **Invalid input is pulled into range rather than rejected.** A denominator of 0 becomes 1, a numerator above the denominator is capped, and negatives, text and blanks become 0 — both the URL and the input fields can be edited by anyone.

## Use

```js
var a = JsDemo.Fraction.make(2, 3);
var b = JsDemo.Fraction.make(3, 5);

JsDemo.Fraction.compare(a, b);        //  1 (the left one is larger)
JsDemo.Fraction.common(a, b);         //  both expressed in fifteenths
JsDemo.Fraction.toPercent(a);         //  66.7

var steps = JsDemo.Fraction.steps(a, b);
var state = JsDemo.Fraction.replay(a, b, steps, 5);  // state after five steps
```

## Kinds of step

| type | Content |
| --- | --- |
| `divide` | Cut that square into as many parts as its denominator |
| `fill` | Fill as many parts as the numerator |
| `recut` | Cut both into the least common multiple of the denominators; `already` is true when they matched from the start |
| `count` | Count in the matched parts and decide which is larger |

`applyStep(state, step)` returns a new state and leaves the old one alone; stepping back replays from the beginning.

The `base` in the state is **the original number of parts (the denominator)** and does not change when the cuts are matched. The figure keeps that original division as thicker lines, so the filled area can be seen not to move.

## What is verified

See the "fractions" group in `tests/cases.js`.

- **Known values**: 2/3 and 3/5 become 10/15 and 9/15; 5/8 and 2/3 become 15/24 and 16/24
- **Equal fractions**: `compare` returns 0 for 1/2 and 2/4, and for 2/3 and 4/6
- **Invalid input**: a denominator of 0, a numerator above the denominator, negatives, text and decimals all yield a fraction inside the allowed range
- **The area does not move**: the filled proportion (numerator ÷ denominator) is unchanged across the matching step
- Rounding for decimals and percentages, and known values for the greatest common divisor and least common multiple
