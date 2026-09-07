# DECISIONS — Module 2: The Serializer & the Round-Trip

Covers the serialization + round-trip code in `engine/mxss-lab/lab.mjs`
(`serialize`, `serializeElement`, `escapeText`, `escapeAttr`,
`escapeAttrLegacy`, `roundTrip`) and `src/serializer.mjs`.

**(a)** spec-forced · **(b)** external-contract-forced · **(c)** our convention.

---

## `escapeText` escapes `& < > U+00A0`; `escapeAttr` also escapes `"`, and also `< >`

**(a) + (b)** WHATWG §13.3's "escape a string" step: attribute mode escapes
`&`, U+00A0, `"`; text mode escapes `&`, U+00A0, `<`, `>`. **(b, de-facto)**
Chrome and Firefox additionally escape `<` and `>` in attribute values (a
mutation-XSS hardening added around 2020, since folded into the standard).
`escapeAttr` matches current Chrome 148 — verified: `title="a<b>"` serialises to
`title="a&lt;b&gt;"`. `escapeAttrLegacy` is the pre-hardening version, exported
only so Module 6 can show the before/after.

## `NO_ESCAPE_TEXT` = style, script, xmp, iframe, noembed, noframes, noscript, plaintext

**(a)** §13.3 step 2: for these parents, the text child's data is appended
"without escaping". Verified against Chrome 148: `<style>a<b>c & d` serialises
byte-for-byte, no `&amp;`, no `&lt;`. This list *is* the attack surface of
Module 3 — every element on it is one whose text content the serializer will
hand back to the next parser exactly as stored.

## We do not escape comment data

**(a)** §13.3 emits `<!--` + data + `-->` with no transform. This is faithful to
the spec (and to browsers) and is itself a minor mutation vector (`--!>`,
nested `<!--`), noted here and picked up in Module 9. Not "fixed" because the
course's job is to model the real serializer, not a safer hypothetical one.

## Void elements: `<img src="x">` with no `</img>`

**(a)** §13.3: void elements (`area base br col embed hr img input link meta
param source track wbr`) emit the start tag only. A trailing `</img>` from a
naive serializer would be reparsed as a stray end tag — itself a (small)
mutation. Our `serializeElement` returns immediately after `>` for these.

## `roundTrip` caps at `max` and reports `stable: false` instead of looping

**(c)** A conforming serializer's output *usually* reaches a fixed point in 1–2
re-parses for the constructs this course covers, but "it terminates" is not a
theorem. Capping and surfacing non-termination as data (rather than hanging, or
silently shipping an unchecked string) is the safe engineering choice and is
exactly how Module 8's hardened sanitizer treats it — a non-fixed-point is a
hard reject.

## `serialize` reads `node.content` for `<template>`

**(a)** A `<template>`'s serialized form is `<template>` + serialize(its
*content* fragment) + `</template>`. The children array of the template element
itself is empty (Module 1). `kidsArray` centralises this so every consumer gets
it right.

## The round-trip is analysed as a *string* fixed point, not a *tree* fixed point

**(c)** We compare `serialize(parse(cur)) === cur` (strings). Comparing trees
would need a tree-equality function and would hide the thing we care about:
whether the *string handed to the browser* is stable. A string fixed point
implies a tree fixed point for a deterministic parser, so nothing is lost.

---

## Decisions We Made

| Decision | Category | Could have been |
|---|---|---|
| `escapeAttr` escapes `< >` (modern) | (b) de-facto | spec-minimal (legacy) — kept as `escapeAttrLegacy` |
| `NO_ESCAPE_TEXT` list of 8 | (a) | — (spec-mandated) |
| comment data unescaped | (a) | escape it (would diverge from browsers) |
| void elements: no close tag | (a) | — |
| `roundTrip` caps + reports instead of looping | (c) | loop until stable (can hang) |
| string fixed point, not tree | (c) | tree equality |

## What We Proved

- Text `<` serialises to `&lt;` under a normal parent and to a live `<` under
  `<style>`/`<xmp>`/`<noscript>` — verified against Chrome 148.
- `serialize(parse("a<b>c"))` is `"a<b>c</b>"` — the identity fails for trivial
  input.
- `serialize(parse(x)) ≠ x` for the classic `<svg><style>` payload, and it takes
  **two** re-parses to reach a fixed point — matching Chrome 148's
  `[s0, s1, s1]`.
- The modern and legacy attribute serializers differ **exactly** on `<` / `>`
  inside attribute values, nothing else.
- 9/9 engine assertions match the browser oracle.
