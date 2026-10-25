# js-demo — JavaScript Learning Demos

[日本語](Readme.md)

Interactive demos for concepts in mathematics, science, computing, data science, statistics and AI — the ones that are hard to hold on to from a formula or an explanation alone. Built by [Transit (トランジット株式会社)](https://trans-it.jp/).

Published at **https://trans-it-jp.github.io/js-demo/**

| Demo | What it covers | 日本語 | English |
| --- | --- | --- | --- |
| k-means | Assignment and centroid update, one step at a time | [/k-means/](https://trans-it-jp.github.io/js-demo/k-means/) | [/en/k-means/](https://trans-it-jp.github.io/js-demo/en/k-means/) |
| 2D coordinate transforms | Five lessons, from a linear transform to rotation about a point | [/linear-transformation/](https://trans-it-jp.github.io/js-demo/linear-transformation/) | [/en/linear-transformation/](https://trans-it-jp.github.io/js-demo/en/linear-transformation/) |

## Design approach

No demo here stops at something you merely watch.

1. **Question** — state the background and the one thing to reach, briefly
2. **Predict** — commit to one expected change before running it
3. **Operate** — change one condition and watch the figure, the numbers and the formula together
4. **Compare** — put it beside the original condition, or a counter-example
5. **Explain** — restate why it changed, and what did not change
6. **Transfer** — check whether the explanation still holds for a different value or example

Alongside that:

- Free to open. No account and no other purchase is a condition of learning here.
- No advertising, no analytics tags, and nothing is sent anywhere. Input is handled inside the browser.
- Every demo states its assumed background, its goal and the limits of its model. No claim is made about curriculum alignment or exam results.
- No information is carried by colour alone. Shape, dashes, numbers and figures carry it too.
- Every value can be set in a number field, not only with a slider or by dragging.
- Randomness is seeded. One seed always gives the same starting state.

## Folder layout

The Japanese pages sit at the default locations and the English ones mirror them under `en/`. Published URLs do not change.

```
/
├── index.html                      Japanese top page (demo catalogue)
├── Readme.md / Readme.en.md        this file
├── k-means.html                    old URL; redirects to /k-means/
│
├── css/
│   └── site.css                    shared design (palette, type, layout)
│
├── js/                             libraries, split by purpose
│   ├── core/                       random numbers and number handling
│   ├── linear-algebra/             matrices in homogeneous coordinates
│   ├── clustering/                 the k-means procedure
│   ├── viz/                        drawing the plane and the scatter plot
│   └── ui/                         controls, tables, Japanese and English wording
│
├── k-means/
│   ├── index.html                  Japanese
│   └── app.js                      page logic, shared by both languages
│
├── linear-transformation/
│   ├── index.html                  Japanese lesson list
│   ├── Readme.md / Readme.en.md    the matrix notes, examples and cheat sheet
│   ├── pages/*.html                five Japanese lessons
│   └── app/lesson.js               page logic shared by all five lessons
│
├── en/                             English pages, mirroring the structure above
│   ├── index.html
│   ├── k-means/index.html
│   └── linear-transformation/
│       ├── index.html
│       └── pages/*.html
│
├── tests/                          verification, runnable in Node and in a browser
├── tools/                          link and contrast checks
├── guides/                         how to add a demo; the accessibility checklist
└── templates/demo.html             the demo page template
```

## The libraries

What the demos are made of lives under `js/`, split by purpose. Each folder documents how to use it.

| Folder | Role | Notes |
| --- | --- | --- |
| [`js/core`](js/core/Readme.en.md) | Seeded randomness, rounding, input parsing | The base layer; no DOM and no drawing |
| [`js/linear-algebra`](js/linear-algebra/Readme.en.md) | Building, composing and applying 3×3 matrices | Checkable against known values without a browser |
| [`js/clustering`](js/clustering/Readme.en.md) | The k-means state machine and synthetic data | Advances assignment and update one step at a time |
| [`js/viz`](js/viz/Readme.en.md) | Drawing the coordinate plane and scatter plot | Holds no mathematics; renders what it is handed |
| [`js/ui`](js/ui/Readme.en.md) | Controls, numeric tables, wording | Anything page-specific stays with that demo |

Dependencies run one way: `core` → `linear-algebra` / `clustering` → `viz` / `ui` → each demo. Demo code also uses `core` directly.

There is no build step. Load the files with `<script>` in order and they register onto `window.JsDemo`. The only external dependency is D3.js v7, loaded from a CDN at a pinned version.

## Before publishing

There is no build step, but three checks run before anything is published. None of them needs an external package.

```bash
node tests/run.js              # the calculations; one failure means do not publish
node tools/check-links.js      # broken links and Japanese/English pairing
node tools/check-contrast.js   # colour contrast (4.5:1 for text, 3:1 for controls and figures)
node tools/check-controls.js   # slider and number field ranges agree
node tools/check-transitions.js # no colour is animated
```

The same verification opens in a browser as well ([tests/index.html](tests/index.html)).

What a machine cannot measure — keyboard operation, screen readers, real devices, projection — a person confirms, following the [accessibility checklist](guides/accessibility.en.md). Filling in that checklist is not a claim of WCAG conformance.

## Adding a demo

There is a [guide](guides/adding-a-demo.en.md) and a [page template](templates/demo.html). The template carries the six stages of the learning flow — question, prediction, operation, comparison, explanation, transfer — as markers.

## Running it locally

`file://` works, but a small server is the reliable way to check the links between pages.

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Adding a language

Wording lives in two places.

- **Text that can simply be written in the page** — headings, introductions, things to check. Written directly into each language's pages.
- **Text that changes with state** — the current step, the iteration count, table captions. Added to the dictionary in [`js/ui/i18n.js`](js/ui/Readme.en.md).

`i18n.js` picks its dictionary from `<html lang>`, so each demo's page logic stays a single file across languages.

## Current status and known gaps

What is published here is a draft of the material. These points are outstanding, and are recorded as such:

- No check of learning effect has been carried out. No trial with learners has taken place.
- Testing on target devices is outstanding. Zoom, projection and small screens are handled by design, but have not been verified on real hardware.
- Shapes can only be drawn with a pointer, not from the keyboard. Every parameter can also be set in a number field.

## Licence

| What | Licence |
| --- | --- |
| Source code | [MIT License](LICENSE) |
| Teaching material (questions, explanations, hints, teacher notes, the Readme notes) | [CC BY 4.0](LICENSE-CONTENT) |

**Adapt and redistribute freely, including commercially, as long as you give credit.** Teachers folding this into their own material is the case it was written for.

A suggested credit line:

```
"JavaScript Learning Demos" by Trans-IT, CC BY 4.0
https://trans-it-jp.github.io/js-demo/
```

D3.js is loaded from a CDN and not redistributed here (ISC License).

No claim is made about curriculum alignment, learning outcomes or exam results.

## Contact

Corrections and suggestions are welcome via [Transit](https://trans-it.jp/). Please do not send anything containing personal data.
