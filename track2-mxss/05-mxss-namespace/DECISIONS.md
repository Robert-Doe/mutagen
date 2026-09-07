# DECISIONS — Module 5: Namespace Confusion

**(a)** spec-forced · **(b)** contract-forced · **(c)** our convention.

## The module compares a NAIVE sanitizer to a CORRECT one, rather than attacking one real library

**(c)** DOMPurify (current) already snapshots and checks namespace — these
vectors don't beat it today. Building a deliberately-naive sanitizer with two
*real, common* bugs (live-list iteration; name-only allow-list) lets the module
show the vectors firing **and** the exact three lines that stop them, without
shipping an attack against a maintained project. Module 10 covers the historical
versions that *were* vulnerable, with CVE numbers.

## `naiveSanitize` iterates the array with `for…of` while splicing it

**(a, JS semantics)** A faithful model of `for (const n of el.childNodes)` +
`n.replaceWith(...)` — the live `NodeList` and the array iterator both keep a
moving cursor, so nodes spliced in at/before the cursor are skipped. This is the
single most common way a real sanitizer misses a reparented node.

## `correctSanitize` = snapshot + `ns !== HTML` reject + `<image>`→`<img>`

**(a)** All three are spec-driven: the snapshot is needed because unwrapping
mutates the list; the namespace check is needed because `<a>`/`<style>` mean
different things per namespace; the `<image>` rename is needed because the HTML
parser itself aliases it. Together they are `DOMPurify`'s `_forceRemove` +
`_checkValidNamespace` + the `.tagName` normalisation, which the tutorial cites.

## "form double-nest" is asserted only in `proof.html`, not the Node test

**(c)** Its leak depends on the precise cursor behaviour of a live `NodeList`
during `form`-in-`form` reparenting, which our array model doesn't reproduce
identically. Rather than fake it, the Node test asserts the *correct* sanitizer
blocks it and the browser `proof.html` demonstrates the naive leak. Honesty over
a green checkmark.

## The "classic" vector is included specifically to show it's DEAD

**(c)** `<svg><style><a title="</style>…">` is the most-quoted mXSS payload on
the internet. Leaving it out would invite "but what about…". Including it, with
`proof.html` showing it does **not** fire, is the point: the 2020 attribute
serializer change (Module 2) closed an entire generation of these.

## What We Proved

- `<mglyph>` keeps `<style>` in MathML (not rawtext) — engine matches Chrome 148.
- HTML aliases `<image>` to a live `<img>`.
- Four vectors (`form` double-nest, `mtext/mglyph/style`, `<image>`, `svg/p`
  breakout) **fire in Chrome 148** against a naive sanitizer — verified in
  `proof.html`.
- Snapshot + namespace enforcement + alias normalisation blocks all four.
- The classic attribute payload does **not** fire — patched at the serializer.
- 9/9 Node assertions pass.
