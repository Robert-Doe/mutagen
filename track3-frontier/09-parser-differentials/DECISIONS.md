# DECISIONS — Module 9: The Sink Zoo

**(a)** spec-forced · **(b)** contract-forced · **(c)** our convention.

## We model four sinks, not seven; the other three are named honestly

**(c)** `innerHTML` (two contexts), `DOMParser`, and `template.innerHTML` are
expressible with our engine (fragment/document parse × scripting flag).
`outerHTML` is `innerHTML` with the parent as context — mentioned, not
re-implemented. `Range.createContextualFragment` and `document.write` need a live
browser (a range object; an open byte stream). The tutorial table carries all
seven; the code carries the four it can *prove*.

## `xmlSerialize` is deliberately naive

**(c)** It implements the XML rules that matter for XSS — every empty element
self-closes, namespaces become explicit `xmlns` attributes — and nothing else.
The point is the contrast: `<div></div>` → `<div/>` in XML, which an HTML
re-parse reads as an unclosed `<div>`. A spec-complete `XMLSerializer` would add
noise without adding a lesson.

## `sinksDisagree` compares element-name lists, not full trees

**(c)** Element names are enough to show divergence and are stable to compare.
Full-tree equality would need a comparison function and would flag cosmetic
differences (text-node splits) that aren't the point.

## The module frames mutation XSS as "one cell of a table"

**(c)** This is the pedagogical payload of Track 3: mXSS isn't special, it's the
(sanitizer-sink, app-sink) pairs that disagree. Test 6 asserts exactly that
framing with `<noscript>` — live through `template.innerHTML` (the sanitizer),
inert through `element.innerHTML` (the app).

## What We Proved

- `<noscript><img onerror>` yields `[noscript, img]` + live through `DOMParser`
  and `template.innerHTML`, and `[noscript]` + inert through `element.innerHTML`.
- `<style><b>x</b></style>` parses to different trees in `<div>` vs `<svg>` context.
- XML serialization emits `<div/>` for an empty `<div>`.
- `sinksDisagree` distinguishes a context/flag-sensitive string from a plain one.
- 6/6 assertions pass.
