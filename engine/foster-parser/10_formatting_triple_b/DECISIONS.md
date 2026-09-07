# Module 10 — DECISIONS

Line-by-line rationale for `src/formatting.js` and `src/dispatch10.js`, plus one additive change to Module
08's `tabletext.js`. Categories as before: **(a)** forced by spec, **(b)** forced by external contract,
**(c)** our own convention.

---

## Why this module exists: two records, one desync

A formatting element like `<b>` has two independent records once inserted: a badge on the stack of open
elements ("currently inside"), and a name on the active formatting elements list ("should be wrapped around
whatever comes next"). "Clear the stack back to a table context" — run by `<tr>`/`<td>`/`<th>` — pops from
the **stack only**. The list is untouched. That divergence, manufactured on purpose by a table-structural
rule that has nothing to do with formatting, is the entire mechanism behind one `<b>` tag becoming three
`<b>` elements. This module builds exactly enough machinery to reproduce it and nothing more.

## `src/formatting.js`

**`FORMATTING_ELEMENTS` contains only `'b'`, not the real spec's full list (a, b, big, code, em, font, i,
nobr, s, small, strike, strong, tt, u).**
**(c) our own convention.** This module's one test case only ever needs `<b>`. Populating the rest
speculatively would be exactly the kind of code this course's engineering conventions warn against writing
before a concrete need exists.

**The Noah's Ark clause (remove the earliest of 3+ matching entries since the last marker) is not
implemented.**
**(c) our own convention, an honest limitation.** No test case here ever pushes the same formatting element
three times without an intervening marker — the mechanism this clause exists to bound (quadratic
reconstruction cost from unbounded duplicate entries) never arises in a single-`<b>`-tag example.

**`clearStackBackToTableContext()` merges the spec's three separate "clear the stack back to a ___
context" operations (table / table body / table row) into one, stopping at any of
`table/tbody/thead/tfoot/tr/template/html`.**
**(c) our own convention**, necessary because Module 05 already collapsed "in table body"/"in row" into
"in table" — there's no way to know which of the three real variants "should" apply without modes this
engine doesn't have. The merged, permissive stop-set is safe specifically because it's a *superset* of
each individual variant's stop-set: it never pops something a real "clear back to X context" would have
kept (every tag in the real spec's three stop-sets is also in this merged one), so the only entries it can
remove are ones every real variant would have removed too. Verified directly: Module 08's existing
`<table><tr><td>` test case was re-run after this module's changes and still passes unchanged (no legitimate
`<tr>` gets popped), while this module's own test proves the stray `<b>` correctly does get popped.

**`reconstructActiveFormattingElements()` is implemented generally (walk backward to find the earliest
entry needing recreation, then forward recreating each), not hardcoded for a single-entry list.**
**(a) forced by spec, with (c) scope**: the general shape costs little extra code over a hardcoded
single-entry version and is what the spec actually describes; it just happens that this module's one test
case never exercises the multi-entry backward-walk with more than one entry needing recreation.

**Reconstruction inserts each recreated element via `insertElementAtAppropriatePlace` — the same
foster-aware function every module since 05 has used — so a reconstruction that happens to occur while the
current node is a fostering target gets fostered itself, automatically, with no special-casing.**
**(a) forced by spec.** This is exactly what makes the SECOND `<b>` (containing `"bbb"`) end up fostered
before the table rather than inside it: reconstruction doesn't know or care that fostering exists: it just
calls the one insertion function every element insertion in this engine already goes through.

## `src/dispatch10.js`

**`inTableSpecificRules10()` calls `clearStackBackToTableContext()` before delegating to Module 05's
original `<td>`/`<th>`/`<tr>` logic, unchanged.**
**(a) forced by spec** for the clearing itself; **(c) convention** for reusing Module 05's function
afterward rather than reimplementing it — consistent with this course's one-source-of-truth rule since
Module 01.

**`<td>`/`<th>` push a marker after Module 05's insertion logic succeeds; `</td>`/`</th>` clear the list
back to that marker.**
**(a) forced by spec.** This is what makes reconstruction correctly skip while inside a cell (`"aaa"`
inserts with no reconstruction needed, since the marker sits at the end of the list) and correctly fire
again once the cell closes and the marker is removed (exposing the `<b>` entry again for `"bbb"`).

**A minimal, targeted `</table>` closing rule was added specifically because this module's own test case
needs it — popping the stack up to and including the nearest `<table>`, regardless of what's on top of it,
then setting mode to `"in body"`.**
**(c) our own convention**, and a deliberate, narrow escalation past a boundary every module from 05 through
08 stopped at on purpose (their `DECISIONS.md` files all name "closing a table properly" as explicitly out
of scope). This module needed to cross that boundary to reach the third `<b>` (reconstructed *after* the
table closes) — the whole point of the canonical example. The rule is intentionally narrow: it doesn't
implement the spec's general "reset the insertion mode appropriately" (which walks the stack considering
every mode, not just table-closing), only the one outcome ("closing a table at the body level always lands
back in `in body`") this module's test needs. A future module needing a more general reset should build
one rather than assume this rule covers it.

**`handleInTableText`'s new `insertChar` parameter (added to Module 08's `tabletext.js`) defaults to the
plain, non-reconstructing inserter — verified by re-running Modules 05 through 09's own tests unchanged
after the change.**
**(c) our own convention**, following the same additive-only pattern Module 03 used for exporting `MODES`:
a new optional parameter with a behavior-preserving default, not a rewrite. Regression-checked directly
(all five modules' `test/demo.js` scripts re-run and confirmed still passing) rather than assumed safe.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| `FORMATTING_ELEMENTS` contains only `'b'` | (c) convention | Only element this module's test needs |
| No Noah's Ark clause | (c) convention, honest limitation | No test case triggers 3+ duplicate entries |
| Merged "clear stack back to ___ context" into one permissive stop-set | (c) convention | Safe superset of all three real variants; verified against Module 08's existing test |
| General (not hardcoded single-entry) reconstruction algorithm | (a) spec | Matches spec shape at little extra cost |
| Reconstruction reuses `insertElementAtAppropriatePlace` unchanged | (a) spec | This is exactly what makes the 2nd `<b>` get fostered too |
| Markers pushed/cleared around `<td>`/`<th>` only | (a) spec | Needed for reconstruction to correctly skip inside a cell |
| Narrow, targeted `</table>` closing rule | (c) convention, deliberate escalation | Needed to reach the 3rd `<b>`, past a boundary every prior module stopped at |
| `insertChar` param added to Module 08's `tabletext.js`, default-valued | (c) convention | Additive-only; regression-verified against 5 modules' existing tests |

## What We Proved

Running `node test/demo.js` against the spec's own canonical example (real output, captured verbatim):

```
── Input (the spec's own canonical example) ──
<!DOCTYPE html><head></head><body><table><b><tr><td>aaa</td></tr>bbb</table>ccc</body>

── Output ──
body
  b
  b
    #text "bbb"
  table
    tbody
      tr
        td
          #text "aaa"
  b
    #text "ccc"
(stopped at token #20: EndTag body — expected; everything left only pops already-correct structure)

Three distinct <b> objects confirmed: <b></b>, <b>bbb</b>, <b>ccc</b>

OK — all assertions passed. Module 10 triple-<b> reconstruction verified against real browser output.
```

This proves, against real captured browser output for the spec's own worked example: one `<b>` start tag
in the source produces **three separate `<b>` element objects** in the final tree — verified not just by
matching serialized output but by `assert.notEqual` checks on object identity between all three. The first
is fostered, then orphaned from the stack (but not the list) by `<tr>`'s clearing. The second is
reconstructed while current node is `tr` — itself a fostering target — so it gets fostered too, landing
beside the first. The third is reconstructed after the table closes, current node is plain `body`, and
lands normally, right after the table. Same reconstruction call, three completely different outcomes,
entirely determined by whatever the current node happens to be each time it fires.
