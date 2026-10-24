# js/core — foundations

[日本語](Readme.md)

The base layer. It touches neither the DOM nor any drawing library: it only provides random numbers and number handling. Every other folder builds on it.

| File | Role |
| --- | --- |
| `seeded-random.js` | Seeded pseudo-random generator (`JsDemo.Random`) |
| `numeric.js` | Rounding, clamping, input parsing, distances (`JsDemo.Numeric`) |

## Loading

Everything registers onto a single `JsDemo` object. These files have no dependencies, so load them first.

```html
<script src="../js/core/seeded-random.js"></script>
<script src="../js/core/numeric.js"></script>
```

## JsDemo.Random

`Math.random()` cannot be reproduced, so it is not used to generate demo data. With a seed, the same sequence comes back every time: a class can share one starting state, and tests can fix their expected values.

```js
const random = JsDemo.Random.create(20261025);   // a number or a string works as a seed

random.next();              // real number in [0, 1)
random.range(-10, 10);      // real number in [-10, 10)
random.int(2, 10);          // integer in [2, 10]
random.pick(["a", "b"]);    // one element of an array
random.shuffle([1, 2, 3]);  // shuffled copy (the input is left alone)
random.normal(0, 0.1);      // normal deviate, mean 0, standard deviation 0.1
random.seed;                // the seed actually used (32-bit integer)
random.reset();             // back to the start of the same sequence
```

```js
// Checking that one seed gives one sequence
const a = JsDemo.Random.create("demo");
const b = JsDemo.Random.create("demo");
a.next() === b.next();   // true
```

## JsDemo.Numeric

Values arriving from input fields are strings, and they may be blank, full-width digits, or out of range. They pass through here and become finite numbers before any calculation sees them.

```js
const N = JsDemo.Numeric;

N.round(3.14159, 2);        // 3.14
N.clamp(12, 0, 10);         // 10
N.toFinite("１２.５", 0);    // 12.5   full-width digits and minus signs are accepted
N.toFinite("", 1);          // 1      the fallback, when the value is not a number
N.readNumber("99", { min: 2, max: 10, integer: true });  // 10

N.format(1 / 3);            // "0.333"  fixed width, for table columns
N.formatShort(2.0);         // "2"      trailing zeros dropped, for headings

N.distance([0, 0], [3, 4]);         // 5
N.distanceSquared([0, 0], [3, 4]);  // 25   no square root when only comparing
N.mean([1, 2, 3]);                  // 2    null for an empty array (not 0)
```

## Conventions

- Nothing that fails `Number.isFinite` reaches a calculation. `NaN` breaks a figure silently.
- `mean` returns `null` for an empty array. Returning `0` would conflate "no values" with "the values sum to zero".
- Rounding happens only for display. A rounded value is never fed into the next calculation.
