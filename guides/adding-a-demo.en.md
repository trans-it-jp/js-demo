# Adding a demo

[日本語](adding-a-demo.md)

There is no build step: put the files in place and load them with `<script>`. Following the existing shape is what keeps the repository navigable as demos accumulate.

## 1. The layout rule

```
<demo-name>/
├── index.html      Japanese
└── app.js          page logic, shared by both languages
en/<demo-name>/
└── index.html      English
```

- **One demo, one directory.** The directory name becomes the published URL.
- **Directory names in lower-case letters and hyphens** (`k-means`, `linear-transformation`). No Japanese, no underscores.
- **Japanese at the default location, English under `en/` at the same depth.** That keeps the URL correspondence intact.
- A demo with several lessons splits them into `pages/` and puts the shared page logic in `app/` (the `linear-transformation` shape).
- **A published URL does not change.** If something really has to move, leave a redirect page at the old URL (`k-means.html` is the example).

## 2. The order of work

### a. The page

Copy [`templates/demo.html`](../templates/demo.html) and replace the `{{ }}` parts. The template carries the six stages of the learning flow — question, prediction, operation, comparison, explanation, transfer — as markers. Do not drop a stage.

The template is **the copy-source for future demos**. The existing k-means and 2D coordinate transform pages were written before it, and the template records their structure; there is no need to rebuild them from it.

Choosing a prediction, progressively revealed hints and switching vocabulary are not in it yet — the template only prompts for them in prose. They are to be built separately.

If the depth changes, fix the number of `../..` segments. The English copy takes `lang="en"`, goes under `en/`, and the two link to each other.

### b. The calculation

Calculation lives in a library under `js/`, not in the page logic.

| Where | What goes there |
| --- | --- |
| `js/core/` | Random numbers, number handling — anything every demo needs |
| `js/<field>/` | That field's mathematics (`linear-algebra`, `clustering`, …) |
| `<demo-name>/app.js` | Reading inputs, calling the drawing, assembling wording |

A new field means a new `js/<field>/` with both `Readme.md` and `Readme.en.md`.

Rules:

- **Touch neither the DOM nor d3.** That is what lets `node tests/run.js` verify it.
- End the file with `})(typeof window !== "undefined" ? window : globalThis);` so Node can load it.
- **The caller passes in the random generator.** Never call `Math.random()` directly, or one seed stops meaning one result.
- Leave no path that divides by zero. `NaN` breaks a figure silently.

### c. Wording

- **Text that can simply be written in the page goes in the HTML** — headings, introductions, things to check.
- **Only text that changes with state** goes into the [`js/ui/i18n.js`](../js/ui/Readme.en.md) dictionary, in both languages.

Overfilling the dictionary means you can no longer tell what a page says by reading it.

### d. Controls

```js
const pairs = JsDemo.Controls.bindPairs(["scale-x", "scale-y"], update);
```

Matching ids `<name>` and `<name>-num` pair a slider with a number field. **Every value gets a number field too**, so the same value is reachable without fine pointer control and from the keyboard.

### e. Verification

Add assertions to `tests/cases.js`.

```js
test("field", "what is being checked", function () {
  near(actual, expected, tolerance, "what to say when it differs");
});
```

Cover known values, boundary cases, invalid input and seeded reproducibility. **A picture appearing on screen is not a pass for correctness.**

## 3. Before publishing

```bash
node tests/run.js              # the calculations; one failure means do not publish
node tools/check-links.js      # broken links and Japanese/English pairing
node tools/check-contrast.js   # colour contrast ratios
node tools/check-controls.js   # slider and number field ranges agree
node tools/check-transitions.js # no colour is animated
python -m http.server 8000     # check display and interaction in a real browser
```

Work through the [accessibility checklist](accessibility.en.md) once per demo. What a machine cannot measure — keyboard operation, screen readers, real devices, projection — a person confirms.

## 4. Listing it in the catalogue

Add a card to the demo list in `index.html` and `en/index.html`, with the title and description plus the field, the level and the status.

Give it a figure that shows what the demo actually does. The figures on the top page are built from computed coordinates.

## 5. Adding a dependency

Pin external libraries to an **exact version** (`d3@7.9.0`, never `d3@7`). A major-version specifier lets the delivered code change under you.

A school network may not reach an external CDN at all. Before adding a dependency, check that it is genuinely needed.

**Check the licence and write it down.** Loading a library from a CDN rather than vendoring it keeps its terms off what this repository distributes, but an attribution duty can remain. When you add one, record its name, its licence, and whether it is vendored or referenced under "Third-party components" in [`NOTICE`](../NOTICE). Do not add anything whose terms you cannot read, or that restricts commercial use or modification.

## 6. What never goes in the public repository

- Internal planning, meeting records, trial records, hours worked
- Learners' names, answers, recordings, marks, or any other personal data
- Credentials
- **Code, figures, data or prose from teaching material someone else made**

Internal material belongs in the management repository, which is private.

### Other people's teaching material

Existing material such as PhET, GeoGebra or TensorFlow Playground is to be **referenced and pointed to, not absorbed.** Linking to it and saying what is worth looking at is fine. Copying its code, figures, data or question text in is not.

Being published free of charge is not permission to redistribute it or use it commercially. Even where the other side's licence does allow it, do not pull it in until the source, the terms and any changes made are recorded.

If a quotation does become necessary, check the terms before taking it in, and state that part's own terms alongside — consistent with the note in [`LICENSE-CONTENT`](../LICENSE-CONTENT) that our licence reaches only the parts we own.
