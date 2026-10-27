# js/learning — learning as a list of steps

[日本語](Readme.md)

The forward pass, backward pass and weight update of a small neural network, produced as a list of steps. Nothing here touches the DOM or d3, so the results can be verified from Node.

| File | Role |
| --- | --- |
| `net.js` | Forward pass, backward pass, numerical differentiation and updates (`JsDemo.Net`) |

## Loading

It uses `JsDemo.Random` and `JsDemo.Numeric`.

```html
<script src="../js/core/seeded-random.js"></script>
<script src="../js/core/numeric.js"></script>
<script src="../js/learning/net.js"></script>
```

## Decisions

- **A step is one node.** The grain is set so that one step can state which value of which node was decided by which expression. Grouping by layer loses track of where a value came from.
- **The backward pass is solved with the chain rule.** Numerical differentiation (nudge a weight, run the forward pass again) is produced separately, as a cross-check. **Backpropagation itself is never shown as trial and error.**
- Hidden layers use sigmoid or ReLU, **the output layer is the identity**, and the loss is squared error with a factor of ½ so that `∂L/∂y = y − t` carries no stray 2.
- **The loss is not rounded.** Numerical differentiation divides a difference of losses by the step size, so rounding here would be magnified a thousandfold and make the two values look as though they disagree. Rounding for display happens when the steps are built.
- Initial weights come **from a seed**, so the same seed always gives the same run. They are rounded to two decimals so the arithmetic can be checked by hand, and biases start at 0.
- **The steps are not all built up front.** Training can continue for any number of passes, so there is no total number of steps; `run()` builds passes as they are asked for.

## Use

```js
var plan = JsDemo.Net.run({
  inputs: 2, outputs: 1, hidden: [3],
  input: [0.5, -0.2], target: [1],
  rate: 0.5, seed: 3, activation: "sigmoid"
});

plan.ensure(40, { probe: "max" });   // build passes until there are 40 steps
var state = JsDemo.Net.replay(plan.initial, plan.steps, 10);  // state after 10 steps
```

`probe` selects the weight to cross-check: `"max"` for the largest gradient, `{layer, node, from}` to name one, `null` for no cross-check.

## Kinds of step

| type | Content |
| --- | --- |
| `forward` | That node's `z` (weights times the previous outputs) and `a` (after the activation) |
| `loss` | Each output with its target and difference, and the loss |
| `delta` | That node's δ — `y − t` in the output layer, from the next layer's δ and weights in a hidden layer |
| `grad` | The weight and bias gradients that follow from that δ |
| `probe` | The losses from re-running the forward pass at ±h, the numerical derivative, the backpropagated value and the gap |
| `update` | Rewrites that layer's weights and biases as `w − rate × gradient` |
| `epochEnd` | The end of one pass, with its loss |

`applyStep(state, step)` returns a new state and leaves the old one alone; stepping back replays from the beginning.

## What is verified

See the "forward and backward passes" group in `tests/cases.js`.

- **The backpropagated gradients agree with numerical differentiation** (central difference, tolerance 1e-4), for different shapes and activations
- A shape small enough to solve by hand (one input, no hidden layer, one output) matches that hand calculation
- Folding the steps one at a time gives the same state as folding them all at once
- The same seed gives the same initial weights
- Training brings the loss down (not necessarily monotonically, so the first and last passes are compared)
