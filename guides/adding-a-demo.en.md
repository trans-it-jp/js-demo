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

Copy [`templates/demo.html`](../templates/demo.html) and replace the `{{ }}` parts. The learning flow has six stages — question, prediction, operation, comparison, explanation, transfer — and the template carries five of them as markers. Do not drop a stage.

**The prediction panel is not in the template** (decided 2026-10-26), because none of the published demos uses one. Add it with `JsDemo.Learning.wirePrediction` in a demo that wants it (see [`js/ui/Readme.en.md`](../js/ui/Readme.en.md)).

The template is **the copy-source for future demos**. The existing k-means and 2D coordinate transform pages were written before it, and the template records their structure; there is no need to rebuild them from it.

Progressive hints (`.hints`) and the vocabulary switch (`.wording`) are built as shared components; the template carries their markers, and the page wires them with `JsDemo.Learning.wireHints` and `wireWording`.

**The share panel** (`#share-url`) is in the template. The page wires it with three calls.

```js
var spec = JsDemo.ShareLink.specFromControls([
  { param: "k", control: "clusters", integer: true }   // short name ← the input's id
]);
JsDemo.ShareLink.wireField({ field: "share-url", button: "share-copy", status: "share-status" });
JsDemo.ShareLink.sync(values, spec);   // whenever the conditions change
```

Rules:

- **Only numbers go in the URL.** Nothing free-form is accepted, so no personal data can get in.
- **Read the ranges from the controls** (`specFromControls`). Copying `min`/`max` by hand means that when the two drift apart, a shared value silently becomes a different one. That happened, which is why `tools/check-controls.js` is now a standing check.
- Drop any parameter that is not in the spec.

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
node tools/check-unused.js     # no definition is left behind unused
node tools/check-catalog.js    # the demo list and the published pages agree
python -m http.server 8000     # check display and interaction in a real browser
```

Work through the [accessibility checklist](accessibility.en.md) once per demo. What a machine cannot measure — keyboard operation, screen readers, real devices, projection — a person confirms.

## 4. Listing it in the catalogue

**First add the demo to [`js/ui/demos.js`](../js/ui/demos.js).** That file is the single source for prerequisite concepts: both the filter on the top page and the "same prerequisites" links on each demo page read it.

```js
{
  id: "folder-name",
  title: { ja: "題名", en: "Title" },      // the same text as each page's <h1>
  concepts: ["coord", "mean"]             // ids from the controlled vocabulary, at most 3
}
```

**When a demo introduces a new prerequisite concept, add its short label (`catalog.concept.*`) and its sentence (`catalog.premise.*`) to [`js/ui/i18n.js`](../js/ui/i18n.js) in both languages.** `node tools/check-catalog.js` reports titles that drift apart and wording that is missing.

Then add a card to the demo list in `index.html` and `en/index.html`, with the title and description plus the field, the written-for level and the status. Keep the card title identical to the one in `demos.js`.

The "same prerequisites" section at the foot of a demo page is in the template. Point its `data-demo` at the `id` in `demos.js` and load `js/ui/demos.js` and `js/ui/related-page.js`. **Nothing is shown when no other demo shares a prerequisite.**

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
