# DECISIONS — Module 1: Foreign Content & the Fragment Parser

Covers `src/foreign.mjs` and the foreign-content / fragment parts of
`engine/mxss-lab/lab.mjs` (`build`, `insertStart`, `parseFragment`).

Every non-obvious choice is tagged:
**(a)** forced by the platform/spec · **(b)** forced by an external contract ·
**(c)** our own convention, replaceable by another consistent choice.

---

## The big one: a fresh 450-line engine instead of extending `dispatch14`

**(c)** The Foster Parenting course ships a real, browser-verified tree builder
(`engine/foster-parser/14_adoption_agency/src/dispatch14.js`). We copied it and
its tests still pass here. We did **not** build Module 1 on top of it.

Why: `dispatch14` is scoped to the table / foster-parenting / adoption-agency
recovery machinery. It calls `NotImplementedYet` for constructs this course
lives on — `<noscript>`, `<template>` in the "in head" mode, `<svg>`/`<math>`
foreign content, RAWTEXT/RCDATA tokenizer states. Bending it to cover those
would mean editing verified code across ten module directories. A focused
~450-line engine that does exactly the six behaviours mutation XSS turns on is
smaller, fully explainable in one sitting, and cross-checked against the same
oracle (a real browser). The foster engine stays in the repo as the reference
for the table-shaped deep dives (Module 5, Module 7) and its own course.

Another consistent choice: use `parse5` as the engine. Rejected to keep the
dependency count at zero and match the sibling courses' "the browser is the
oracle" discipline.

## `El` carries both `.ns` and a namespace *stack* during the build

**(a)** The spec's "adjusted current node" and its foreign-content rules are
stack-sensitive: whether `<style>` is rawtext depends on the namespace context
*at that moment*, which changes as elements open and close. `nsStack` mirrors
`stack` so `curNs()` is O(1). An element's final `.ns` is fixed at insert time
(matches the DOM: `el.namespaceURI` never changes).

## Integration points push `HTML` onto `nsStack` but the element keeps `.ns = SVG/MATHML`

**(a)** This is exactly what the DOM shows: `<svg><desc>` — the `<desc>` element
is in the SVG namespace (`desc.namespaceURI` is the SVG URI) but an `<img>`
inside it is in the HTML namespace. The element's identity and its content's
parsing rules are two different things, and the spec treats them separately.

## The `<mglyph>` / `<malignmark>` exception is hard-coded against the parent element

**(a)** WHATWG §13.2.6.5: inside a MathML text integration point, `<mglyph>` and
`<malignmark>` do *not* switch to HTML — they stay MathML. We detect it by
checking `top()` is a MathML text-integration element. This is the single most
load-bearing line for Module 5's still-live bypasses, so it gets its own comment
block in the source.

## Breakout list is a subset of the spec's

**(c)** The spec lists ~40 breakout tags. We include the ones payloads use
(`b i p br img table div` + headings + list items + `font`). Adding the rest is
a one-line edit to the `BREAKOUT` set; nothing else changes. Documented as a
subset so a reader diffing against the spec knows it is deliberate.

## CDATA: text in foreign content, bogus comment in HTML — decided by `curNs()`

**(a)** `<![CDATA[x]]>` becomes a text node only when the adjusted current node
is a non-HTML element. Our engine checks `curNs() !== HTML` at the point the
CDATA token is seen. Inside an integration point (`curNs()` is HTML) it becomes
`<!--[CDATA[x]]-->` — verified against Chrome 148.

## `parseFragment` context element seeds the mode; default context is `body`

**(b)** `element.innerHTML = str` is defined (§13.4) as "parse `str` with
`element` as the context". The context sets the initial insertion mode and can
put the tokenizer directly into RAWTEXT (`<style>` context), RCDATA
(`<textarea>` context), or a foreign namespace (`<svg>` context). We expose this
as the second argument. `body` is the default because it is the most common real
sink and produces the least surprising tree.

## Attribute values are entity-decoded at parse time; rawtext content is not

**(a)** §13.2.5: character references are consumed in the "attribute value"
and "RCDATA" states, not in "RAWTEXT" or "script data". `parseStartTag` runs
`decodeEntities` on every value; the rawtext branch of the tokenizer does not.
This asymmetry is the whole of Module 6.

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| Fresh engine, not `dispatch14` | (c) | extend foster engine; use parse5 |
| `nsStack` parallel to `stack` | (a) | recompute adjusted current node each time |
| Integration point → push HTML, keep element ns | (a) | — (this is what the DOM does) |
| `<mglyph>`/`<malignmark>` exception hard-coded | (a) | — (spec-mandated) |
| Breakout list is a documented subset | (c) | full ~40-entry list |
| CDATA routed by `curNs()` | (a) | — |
| Default fragment context `body` | (c) | require explicit context every call |

## What We Proved

- `<style>` holds a **text node** under an HTML parent and an **element** under
  an SVG parent — same characters, verified both ways against Chrome 148.
- `<svg><p>` ejects `<p>` to the HTML namespace as a sibling of `<svg>`.
- SVG `<desc>`/`<foreignObject>` and MathML `<mtext>` parse their content as
  HTML; `<mglyph>` inside `<mtext>` does not.
- `element.innerHTML = str` starts the parse in the context element's mode —
  `<textarea>` context keeps `<img src=x onerror=alert(1)>` as inert text; `<div>`
  context makes it a live element.
- 10/10 engine assertions match the browser oracle.
