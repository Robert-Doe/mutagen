# Module 13 — DECISIONS

Line-by-line rationale for `src/scope.js` and `src/dispatch13.js`. Categories as before: **(a)** forced by
spec, **(b)** forced by external contract, **(c)** our own convention. This module closes Track 1.

---

## Why "table is a wall" and "the five foster-parenting elements" are the same fact, seen twice

Module 04 derived the five foster-parenting elements (`table`, `tbody`, `tfoot`, `thead`, `tr`) from one
question: does this element have anywhere to host a stray node? This module's `BASE_SCOPE` set contains
`table`, `td`, `th` (plus non-table elements: `applet`, `caption`, `html`, `marquee`, `object`, `select`,
`template`) — a check about whether an END TAG can reach past this element, not about where a node gets
inserted. They're different questions, but `table`/`td`/`th` show up as an effective "wall" in both: content
can't cross a table boundary going IN via ordinary insertion (that's fostering) any more than an end tag
can cross it going OUT via scope. Two independent-looking mechanisms, converging on the same structural
elements, for related reasons.

## `src/scope.js`

**MathML/SVG scope entries (`mi`/`mo`/`mn`/`ms`/`mtext`/`annotation-xml`, `foreignObject`/`desc`/`title`)
are omitted from `BASE_SCOPE`.**
**(c) our own convention**, consistent with Module 00's original scoping decision (no namespace tracking)
and Module 06's foreign-element handling (foreign elements are inserted, not namespace-distinguished). No
test case in this module needs a foreign element to act as a scope boundary.

**`hasElementInScope` checks for the target BEFORE checking for a scope-boundary match, at each stack
position.**
**(a) forced by spec.** This ordering is what makes `hasInTableScope(stack, 'table')` return `true`
immediately when `table` IS the current node, even though `table` is also literally a member of
`TABLE_SCOPE` itself — if the boundary check ran first, a target that's also its own scope boundary could
never be found. The real spec's algorithm checks target-match first for exactly this reason.

**Four separate exported functions (`hasInScope`, `hasInListItemScope`, `hasInButtonScope`,
`hasInTableScope`) rather than one function taking a scope-list parameter at every call site.**
**(c) our own convention**, for readability at the call site — `hasInScope(state, 'div')` states which
variant is being asked for directly, rather than requiring the reader to also inspect which list constant
was passed. `hasElementInScope` (the parameterized version) is still exported and still used internally by
all four — this is a thin naming convenience, not a second implementation.

## `src/dispatch13.js`

**The generic `EndTag` branch checks `hasInScope` first; failing that check means silently ignoring the
token — no pop, no error surfaced, no exception.**
**(a) forced by spec.** This is the literal mechanism: an end tag whose target isn't in scope is a parse
error that the spec resolves by simply ignoring the token. This module's Part 1 test proves this is
externally distinguishable from a crash or a wrong pop — the outer `<div>` ends up with exactly the
children a real browser gives it, not a token short or a token confused.

**A scope check that passes but doesn't find an exact current-node match falls through to
`NotImplementedYet`, rather than attempting a pop anyway.**
**(c) our own convention**, an honest, deliberate limitation carried forward from every module since 05.
The real spec's next step there is "generate implied end tags," a distinct algorithm this engine has never
built (it would pop intervening elements whose own end tags are omittable, like `<p>` or `<li>`, before
reaching the target). No test case in this module needs it — Part 1's stray `<div>` is caught by the scope
check itself, before implied-end-tag generation would ever become relevant.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| MathML/SVG scope entries omitted | (c) convention | No namespace tracking, consistent since Module 00/06 |
| Target-match checked before boundary-match, per stack position | (a) spec | Lets a scope boundary find itself (e.g. table-scope finding `table`) |
| Four named functions wrapping one parameterized core | (c) convention | Call-site readability; no duplicated logic |
| Failed scope check → silent ignore, no pop | (a) spec | The literal parse-error-then-ignore resolution |
| Scope-pass-but-no-exact-match → `NotImplementedYet` | (c) convention | "Generate implied end tags" not built; no test needs it |

## What We Proved

Running `node test/demo.js` (real output, captured verbatim):

```
── Part 1: a stray </div> inside a <td> can never close the outer <div> ──
body
  div
    table
      tbody
        tr
          td
(stopped at token #14: EOF )

OK: the inner </div> was silently ignored (parse error, no effect); the outer <div> still has exactly
one child (the table) — no stray text, no premature close.

── Part 2: the four scope variants disagree on purpose ──
Stack: html > body > div > ol > li — hasInScope('div') = true, hasInListItemScope('div') = false
Stack: html > body > div > button — hasInScope('div') = true, hasInButtonScope('div') = false
Stack: html > body > div > table > tbody > tr > td — hasInScope('div') = false
Stack: html > body > table — hasInTableScope('table') = true

OK — all assertions passed. Module 13 scope verified, both end-to-end and variant-by-variant.
```

Part 1 was verified against real browser `DOMParser` output before this engine was run against the same
input — proving "table is a wall" end to end, through the complete dispatch chain built since Module 01,
not just as an isolated scope-function unit test. Part 2 proves the four scope variants are genuinely
different functions with genuinely different answers for the same stack: base scope lets a `<div>` be found
past an `<ol>`/`<li>` or a `<button>`, while the list-item and button variants each specifically block it —
and a `<td>` blocks even the base variant, which is "table is a wall" derived directly from the scope
algorithm itself, independent of Part 1's end-to-end observation.

This closes Track 1. Fourteen modules (00–13) built a real, hand-rolled, spec-verified parser engine from
tokens and node classes up through foster parenting's full seven substeps, formatting-element
reconstruction, template redirection, fragment parsing, and scope — catching and fixing three real bugs
along the way (Module 01's DOCTYPE reprocessing, Module 08's discovery of Module 05's `<tr><td>`
double-insertion, Module 11's template-redirect gap), and honestly routing around exactly the cases that
would have required building mechanisms — RAWTEXT tokenizing, the adoption agency, `in template` mode's
per-tag dispatch — no test case in this course actually needed.
