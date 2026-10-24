# Accessibility checklist

[日本語](accessibility.md)

Worked through once per demo before publishing. **A filled-in checklist is not a claim of WCAG conformance.** What a machine can measure is kept separate from what only a person on real hardware can confirm.

Reference: [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/)

## 1. What a machine measures

```bash
node tools/check-contrast.js   # colour contrast ratios
node tools/check-links.js      # links and Japanese/English pairing
node tests/run.js              # known values and boundary cases
```

| Item | Threshold | How | Status |
| --- | --- | --- | --- |
| Text contrast | 4.5:1 or better | `check-contrast.js` | 2026-10-25: all 23 pairs pass |
| Contrast of controls and graphical elements | 3:1 or better | same | same |
| How close the series colours are to each other | Know which pairs are close; carry the difference with shape and number too | second half of the same output | Known. Seven marker shapes and numbers carry it |

Contrast is computed from the colour values alone. On a real screen it shifts with overlap, opacity and the device, so this alone is not a pass.

## 2. What the design holds to (check while implementing)

| Item | How it is held | Where to look |
| --- | --- | --- |
| Nothing by colour alone | Colour, shape, number, dashes and figures together | Scatter clusters; original vs transformed shape |
| An alternative to dragging | Every value has both a slider and a number field | "Change the conditions" on each demo |
| An alternative to the figure | The same numbers appear in a table | Cluster breakdown; matrix tables |
| State announcements | The current step is written into an `aria-live="polite"` region | `#live` on k-means |
| Figure descriptions | SVG carries `role="img"` and `aria-label` | `js/viz/plane.js`, `scatter.js` |
| Reaching the content | A skip link at the top | Every page |
| Visible focus | `:focus-visible` draws an outline | `css/site.css` |
| Respecting reduced motion | `prefers-reduced-motion` honoured | `css/site.css` |
| Small screens and zoom | Figures use `viewBox`; no horizontal overflow | Checked at 375px wide |

## 3. What a person has to confirm (outstanding)

This needs hardware and people. **Do not mark it done.**

| Item | How | Status |
| --- | --- | --- |
| Everything reachable by keyboard | Tab, Shift+Tab, Enter, Space, arrows only | Not checked |
| Focus order matches the visual order | same | Not checked |
| A screen reader conveys the content | NVDA / VoiceOver / Narrator | Not checked |
| Display on real devices | The target tablets, phones and school machines | Not checked (emulation only) |
| Zoom | Browser at 200% and OS text scaling | Not checked |
| Projection | Whether lines and text read on a real classroom projector | Not checked |
| How it looks with colour vision differences | Someone who has one, or a simulation | Not checked |
| School network restrictions | Whether the D3 CDN is reachable | Not checked |

## 4. Known gaps

| Gap | Effect | How it is handled |
| --- | --- | --- |
| Drawing is pointer-only | Lines, circles, rectangles and freehand strokes cannot be drawn from the keyboard | Stated on each page. Every numeric parameter is still reachable through a number field |
| No pause control | Nothing currently animates on its own, so there is nothing to pause | To be built when a demo with continuous motion is added |

## 5. Recording the result

Results go into "端末と操作の確認" in `planning/OPERATIONS.md` (the management repository), with the date, device, conditions, result and what was *not* checked kept apart. Emulation and real hardware are recorded as different things.
