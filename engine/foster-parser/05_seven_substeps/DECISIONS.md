# Module 05 — DECISIONS

Line-by-line rationale for `src/location.js` and `src/dispatch5.js`. Categories as before: **(a)** forced
by spec, **(b)** forced by external contract, **(c)** our own convention.

---

## Verification methodology for this module specifically

Every prior module's "What We Proved" section verified this engine against *itself* — internal
consistency, asserted by hand-derived expected values. This module is the first to verify against a real
browser's `DOMParser`, per `ROADMAP.md`'s explicit scope for Module 05. Two exact input strings were run
through `new DOMParser().parseFromString(html, 'text/html')` in a live browser tab and their resulting
`document.body` subtrees captured verbatim (recorded below); this engine's output for the *same exact input
strings* is then compared byte-for-byte against those captured trees, using a serializer
(`serializeLikeBrowser`) written to produce identical formatting — no format-translation ambiguity, no
"roughly matches." Both captured trees are reproduced here so this claim is checkable without re-running
the browser session:

```
Input: <!DOCTYPE html><head></head><body><div>abc<table>def</table></div></body>
body
  div
    #text "abcdef"
    table

Input: <!DOCTYPE html><head></head><body><table><td><table><tr>FOO</table></table></body>
body
  table
    tbody
      tr
        td
          #text "FOO"
          table
            tbody
              tr
```

## `src/location.js`

**`getAdjustedInsertionLocation()` implements the full "appropriate place for inserting a node" algorithm
(Prerequisite P5) — step 1 (target selection), step 2 (the foster-parenting gate, delegated unchanged to
Module 02's `isFosterParentingTarget`), step 3 (the ordinary case) — for the first time, rather than the
foster-only fragment every module through 04 needed.**
**(a) forced by spec**, with **(c) convention** in scope: no override-target parameter exists yet, because
nothing through Module 09 needs one (the adoption agency algorithm, which does, is Module 10's concern).
Adding it now would be exactly the kind of speculative future-proofing this course's engineering
conventions warn against.

**Foster-parenting substeps 1 and 3 (the last-template check, and the "redirect into template contents"
consequence) are NOT implemented — a `<template>` on the stack is treated as an ordinary element.**
**(c) our own convention**, explicitly scoped in `ROADMAP.md`: this engine has no `DocumentFragment`/
template-contents node kind until Module 11. This is a real, honest gap, not a hidden one — if a future
test case put a `<template>` inside a table, this module's algorithm would silently give the wrong answer
(it would fall through to substep 2's ordinary table-relative computation instead of redirecting into the
template). No test case in this module does that.

**Substep 4 (the "no table on the stack at all" fragment case) is implemented and tested, even though this
engine cannot naturally reach that state through real parsing until Module 11 (fragment parsing).**
**(c) our own convention**, consistent with Module 02's empty-stack test: implementing the total algorithm
now, rather than a partial version that would need revisiting later, costs one branch and is exercised by
this module's own separate unit-style check (see `test/demo.js`'s use of a synthetic no-table stack,
mirroring Module 04's `checkTarget` pattern).

**Substeps 6–7 (the table was removed/moved from the tree mid-parse) are implemented but not exercised
against a real browser — only checked for internal consistency.**
**(c) our own convention, and an honest limitation.** Reaching this state for real requires an inline
`<script>` executing mid-parse (e.g. calling `table.remove()`) — genuine incremental, script-interleaved
parsing, which is out of this course's engine's scope entirely (`ROADMAP.md`: this engine parses a static
string in one pass; it doesn't tokenize incrementally around script execution). `DOMParser` doesn't execute
scripts either, so there's no way to verify this branch against a live browser using this engine's testing
approach. It's included because the spec requires it and because the algorithm should be total, not because
this module claims to have verified it against real browser behavior — that distinction matters and is
stated plainly here rather than blurred.

**`insertCharacterAtAppropriatePlace()`/`insertElementAtAppropriatePlace()` are safe to call
unconditionally — in both fostering and non-fostering situations — because `getAdjustedInsertionLocation`'s
step-3 branch degrades to exactly Module 01's original "current node, last child" behavior whenever the gate
is false.**
**(a) forced by spec** (this equivalence is exactly what the real algorithm specifies — step 3 only differs
from Module 01's hardcoded behavior when step 2 fires) — this is the fact that makes Module 05's
architecture (below) possible without duplicating "ordinary" and "foster-aware" insertion as two separate
code paths callers have to choose between.

## `src/dispatch5.js`

**This module defines its own `inBodyFosterAware()` instead of reusing Module 01's `MODES['in body']` the
way Module 03 reused it directly.**
**(c) our own convention, and a deliberate escalation from Module 03's approach.** Module 03 never needed
insertion to happen anywhere other than "current node, last child," so calling `MODES['in body']` directly
was sufficient and correct. Module 05's entire point is to change *where* insertion happens — and Module
01's `insertCharacter`/`insertHtmlElement` are private closures over a hardcoded location, not parameters
Module 05 could swap out. Reimplementing an equivalent rule set that calls Module 05's own
location-aware insertion functions is the smallest change that achieves this without editing Module 01's
file's behavior (only Module 03 did that, narrowly, for an additive export — see that module's DECISIONS.md).

**`inBodyFosterAware()` adds a generic "any other start tag" / "any other end tag" fallback that Module 01
never had.**
**(c) our own convention**, added because this module's own test case (`<div>...`) requires it — real "in
body" has dozens of specific per-tag rules (for `<p>`, `<a>`, headings, lists, and more) this course does
not reproduce. The generic fallback (insert ordinarily; pop on a matching end tag) is correct for simple,
well-nested content like a bare `<div>` and is not claimed to be correct for anything requiring
implicit-closing behavior (e.g. a stray `<p>` before a `<div>`) — no test case here exercises that.

**`inTableSpecificRules()` implements only `<td>`/`<th>`/`<tr>`'s implied-tbody/implied-tr behavior, using
Module 01's plain (non-foster-aware) `insertHtmlElement` for each implied element.**
**(a) forced by spec, narrowly.** These elements are inserted via their OWN dedicated "in table" clauses,
which the spec never routes through the anything-else/foster-parenting fallback at all (Module 03's
DECISIONS.md: foster parenting has exactly one trigger point, and this isn't it). Using the plain,
unconditional insertion function here is therefore spec-accurate, not a shortcut. Real "in table" also has
dedicated clauses for `<caption>`, `<colgroup>`, `<col>`, `<tbody>`/`<thead>`/`<tfoot>`, a nested `<table>`,
`<style>`/`<script>`/`<template>`, `<input type=hidden>`, and `<form>` — all deferred to Modules 06, 07, and
12, where the roadmap places them.

**This engine does not implement "in row" or "in cell" as distinct insertion modes — after opening a `<tr>`
or a `<td>`/`<th>`, `state.mode` stays `"in table"`.**
**(c) our own convention**, and the load-bearing simplification that makes this module's nested-table test
case reachable without building two more modes. It's safe specifically because Module 02's gate already
discriminates fostering purely by *current node identity* (`tr` fosters, `td` doesn't — proven in Module
04), never by *mode name*. A `<tr>` current node fosters a stray character exactly the same way whether the
engine calls its current mode `"in row"` or `"in table"`; the mode name was never actually load-bearing for
that decision, only the current-node check was. This module's own test case (FOO correctly fostered from
inside a `<tr>`, and correctly *not* fostered from inside a `<td>`) is the direct proof this collapsing is
safe for the cases this course covers — a more complete engine would still want the distinct modes for
other reasons (which specific-tag rules apply), which is why `ROADMAP.md` leaves room for Modules 06–12 to
revisit this.

**Both test cases are allowed to end in a caught `NotImplementedYet`, and the demo asserts the tree is
already fully and correctly built at that stopping point, rather than trying to reach true end-of-input.**
**(c) our own convention**, consistent with every module since 01. Case 1 stops at `EOF` (this engine
doesn't implement an EOF rule); Case 2 stops at the inner `</table>` (this engine's simplified `EndTag`
rule only pops when the *tag name matches the current node exactly* — closing a table whose current node is
several levels deeper, like `<tr>`, requires "generate implied end tags," a real spec algorithm not yet
built). In both cases, everything the remaining tokens would have done is *pop* elements already correctly
placed — no further insertion happens after the stopping point, which is why the tree at that moment is
provably complete for comparison purposes, not merely "close enough."

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| Full appropriate-place algorithm (steps 1–3), no override-target param yet | (a) spec, (c) scope | Override target isn't needed until Module 10 |
| Template substeps (1, 3) not implemented | (c) convention | No `DocumentFragment` node kind until Module 11; honestly flagged |
| Fragment-case substep (4) implemented despite being unreachable via real parsing yet | (c) convention | Keeps the algorithm total; tested synthetically, like Module 02's empty-stack case |
| Detached-table substeps (6–7) implemented but not browser-verified | (c) convention | Requires script-interleaved parsing, out of this engine's scope entirely |
| New `inBodyFosterAware()` instead of reusing Module 01's `MODES['in body']` | (c) convention | Module 05 must change *where* insertion happens; Module 01's version has the location hardcoded |
| Generic start/end-tag fallback added for plain elements like `<div>` | (c) convention | Needed for this module's own test case; not claimed correct beyond simple nesting |
| `<td>`/`<th>`/`<tr>` implied-element rules use plain (non-foster) insertion | (a) spec | These clauses never route through the foster-parenting fallback in the real spec either |
| "in row"/"in cell" collapsed into "in table" (mode name never changes) | (c) convention | Gate discriminates by current-node identity, not mode name — proven safe by this module's own test |
| Both test cases stop at a documented `NotImplementedYet` boundary | (c) convention | Remaining tokens only pop already-correct structure; tree is provably complete at that point |

## What We Proved

Running `node test/demo.js` (real output, captured verbatim):

```
── Case 1: <div>abc<table>def</table></div> ──
body
  div
    #text "abcdef"
    table
(stopped at token #15: EOF — expected, this engine doesn't implement EOF handling)

── Case 2: <table><td><table><tr>FOO</table></table> (nested table) ──
body
  table
    tbody
      tr
        td
          #text "FOO"
          table
            tbody
              tr
(stopped at token #11: inner </table> — expected; the tree built so far is already complete and correct)

OK — all assertions passed. Module 05 adjusted insertion location verified against real browser output.
```

This proves, against real captured `DOMParser` output rather than hand-derived expectations:

1. The full "appropriate place for inserting a node" algorithm — not just the foster-parenting substeps in
   isolation — produces the exact same DOM a real browser produces for a simple fusion case (`abc` + `def`
   → one `"abcdef"` text node, straddling the point where a `<table>` was inserted between them).
2. The exact same algorithm, applied to the nested-table case from the attached reference course's own
   Module 03, correctly fosters `FOO` out of the *inner* table's `<tr>` and into the *outer* table's `<td>`
   — one hop out of the nearest open table, landing still inside a table overall, matching this course's
   repeated warning that "foster parenting removes content from tables" is a false summary.
3. A `<td>` current node and a `<tr>` current node, both reachable through the same minimal
   `inTableSpecificRules()`, produce opposite fostering behavior for identical character input — the
   clearest possible demonstration that Module 04's five-element derivation is load-bearing in a real,
   working parse, not just a standalone truth table.

Module 06 takes the location algorithm this module built and proves it applies uniformly to more than just
HTML elements and characters — foreign (SVG/MathML) elements and formatting-reconstruction output route
through the exact same `getAdjustedInsertionLocation` call, unchanged.

## Addendum — a bug found while building Module 08

`inTableSpecificRules()`'s original `<td>`/`<th>`/`<tr>` handling unconditionally implied a fresh
`<tbody>`/`<tr>` before every cell, with no check for whether one was already open. This was never wrong
for this module's own test case (`<table><td>`, with no explicit `<tr>`), so it passed every assertion
above unchanged. Module 08's test cases use an explicit `<table><tr><td>a</td></tr>...` — and with the
original code, that produced a spurious nested `tbody > tr > tbody > tr > td` instead of `tbody > tr > td`,
because the `<td>` handler implied a second `tbody`/`tr` pair *inside* the already-open `<tr>`.

Fixed by checking `currentNode(state)` first: if it's already `tr` (for `<td>`/`<th>`), or already one of
`tbody`/`thead`/`tfoot` (for `<tr>`), skip the corresponding implied insertion. Both of this module's
original test cases were re-run after the fix and produce byte-identical output to what's recorded above —
the fix only changes behavior for the previously-untested case. See Module 08's `DECISIONS.md` for the test
that caught this.
