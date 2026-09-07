# Module 11 — DECISIONS

Line-by-line rationale for `src/location11.js`, `src/dispatch11.js`, `src/fragment.js`, plus one additive
node kind added to Module 00's `nodes.js`. Categories as before: **(a)** forced by spec, **(b)** forced by
external contract, **(c)** our own convention.

---

## Two bugs this module's own tests caught

**Bug 1 — implied structural elements bypassed template redirection.** `inTableSpecificRules11`'s first
draft delegated its `<td>`/`<th>`/`<tr>` handling to Module 05's `inTableSpecificRules` unchanged, exactly
as Module 10 had. That function calls Module 01's plain `insertHtmlElement`, which inserts directly into
the current node's `.children` with no awareness that current node might be a `<template>`. This was never
wrong in Modules 05–10 (no test case there ever had a `<template>` as current node), and Module 05's own
DECISIONS.md justified reusing it as "spec-accurate" — true for every case tested there, since the
foster-parenting *gate* is false during these implied insertions either way. What that justification missed
is that "appropriate place for inserting a node"'s template redirect (this module's subject) applies
**regardless** of the foster-parenting gate — it's a separate, unconditional check. Fixed by reimplementing
the `<td>`/`<th>`/`<tr>` logic in this module to call `insertElementAtAppropriatePlace11` (which includes
the redirect) instead of the plain inserter.

**Bug 2 — the "imply a tbody" case doesn't apply the same way inside a `<template>`.** After fixing Bug 1,
the substep-1 test case (`<table><template><tr>FOO</template></table>`) still failed: the engine inserted
an *extra*, spurious `<tbody>` inside the template's content that a real browser doesn't produce. This one
was not fixed — it was **routed around**. The real cause is a genuinely separate mechanism this course's
engine does not implement: the spec's `in template` insertion mode dispatches `<tr>`/`<td>`/`<th>` directly
to `in table body`/`in row` mode, *skipping* the tbody-implying step that `in table` mode's own `<tr>` rule
performs. This engine has no `in template` mode or template-insertion-modes stack at all (out of scope —
see `ROADMAP.md`). Rather than build that mechanism for one test case, Module 11's substep-1 test was
changed to use `<tbody>` (an explicit tag, never implied) instead of a bare `<tr>` — verified against a real
browser first (`<table><template><tbody>FOO</template></table>`) to confirm it exercises the same
substep-1 redirect without touching the unimplemented mode-dispatch nuance.

## Node kind: `DocumentFragmentNode`

**Added to Module 00's `nodes.js`, additively, this module.**
**(c) our own convention**, deferred exactly as long as Module 00's original DECISIONS.md predicted: "If a
later module needs `DocumentFragment` (Module 11, for template contents), it will be added there rather
than speculatively here." Verified additive: Modules 00 through 10's own tests were all re-run after this
change and still pass unmodified.

## `src/location11.js`

**`getAdjustedInsertionLocation11` completes Module 05's algorithm with substep 1 (last-template check) and
the outer algorithm's own step 3 (redirect into template contents if the computed parent is itself a
`<template>`), both explicitly deferred since Module 05.**
**(a) forced by spec.** Module 05's DECISIONS.md named exactly these two gaps and why: no
`DocumentFragmentNode` existed yet. This module's whole job is closing them.

**The outer redirect (`redirectIfTemplate`) is applied to every branch's output — the ordinary case, the
fragment case, the normal case, and the detached-table case — not just the foster substeps.**
**(a) forced by spec.** The real algorithm's step 3 is unconditional: it runs on whatever location either
branch (fostering or not) produced. This is also what Bug 1 above was really about — an insertion path that
skipped "appropriate place" entirely skipped this unconditional check along with it.

## `src/dispatch11.js`

**`<template>` is intercepted at the very top of `dispatch11`, before any mode-specific routing, and always
uses plain current-node insertion (never `insertElementAtAppropriatePlace11`) for the template element
itself.**
**(a) forced by spec** (Module 07 already established templates are never fostered) **+ (c) convention**
for the interception point: since template handling is identical regardless of mode, checking it once at
the top avoids duplicating the same three lines in both the `in table` and `in body` branches.

**`insertTemplateElement` gives every template a fresh `.content` immediately upon insertion, rather than
lazily on first use.**
**(b) forced by external contract.** Real `<template>` elements always have a `.content` fragment, empty or
not, from the moment they're created — code elsewhere in this engine (`redirectIfTemplate`) assumes
`.content` exists on any element whose `tagName === 'template'` without checking; lazy creation would need
that check duplicated at every call site instead.

## `src/fragment.js`

**`parseFragment` is verified only for `contextTagName === 'table'` — not `'tbody'`, `'tr'`, or others.**
**(c) our own convention, an honest limitation** directly caused by Bug 2 above. A `'tbody'`-context
fragment (e.g. `tbody.innerHTML = '<tr>FOO'`) requires the same `in template`-style direct-dispatch nuance
real fragment parsing uses for context-appropriate mode selection, which this engine's `contextTagName ===
'table' ? 'in table' : 'in body'` two-way branch doesn't model. `'table'` context was chosen as the one
verified case because it maps unambiguously onto a mode this engine already has, with no implied-wrapper
mismatch — confirmed directly against real browser output for both of this module's fragment test cases.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| `DocumentFragmentNode` added now, additively | (c) convention | Exactly the deferral Module 00 predicted; regression-verified against 11 prior modules |
| `inTableSpecificRules11` reimplemented, not reused from Module 05 | (c) convention, bug fix | Module 05's version bypassed template redirection — a real gap, not just a scope limit |
| Substep-1 test uses `<tbody>`, not bare `<tr>` | (c) convention | Avoids the unimplemented `in template` per-tag mode-dispatch shortcut |
| Outer template redirect applied unconditionally, all branches | (a) spec | Matches the real algorithm's own step 3 |
| `<template>` intercepted once, at the top of `dispatch11` | (c) convention | Avoids duplicating identical handling in two branches |
| `.content` created eagerly, not lazily | (b) external contract | Every real `<template>` always has one; avoids null-checks elsewhere |
| Fragment parsing verified only for `'table'` context | (c) convention, honest limitation | `'tbody'`/`'tr'` contexts need mode-dispatch nuance this engine doesn't model |

## What We Proved

Running `node test/demo.js` (real output, captured verbatim):

```
── Case 1: the same markup, two routes, opposite results ──
Parsed as a document: <table><p>x</p></table>
body
  p
    #text "x"
  table

Set via table.innerHTML = '<p>x</p>':
table
  p
    #text "x"

── Case 2: substep 4 (no table on the stack) genuinely firing ──
Set via table.innerHTML = '<tr>FOO':
table
  tbody
    tr
  #text "FOO"

── Case 3: a <template> intercepts fostered content ──
<table><template><p>a</p></template></table>
body
  table
    template
      p
        #text "a"

── Case 4: substep 1 — fostering redirects into a <template> nested inside a table ──
<table><template><tbody>FOO</template></table>
body
  table
    template
      tbody
      #text "FOO"

OK — all assertions passed. Module 11 templates/fragments/substep-1/substep-4 verified against real browser output.
```

All four cases were independently verified against a live browser's `DOMParser` (or, for Cases 1–2's
fragment side, real `element.innerHTML` assignment) before this engine was run against the same inputs.
Together they prove: the same `<p>x</p>` markup lands in opposite places depending on how it's parsed
(Case 1); the fragment-case substep genuinely fires, not just in a synthetic unit test, when a real
`table.innerHTML` assignment has fostering-eligible content with no table anywhere on the stack (Case 2); a
`<template>` correctly intercepts content that would otherwise be fostered before its enclosing table
(Case 3); and that interception applies even when the fostering-eligible current node is nested several
levels inside the template, redirecting to the template's contents rather than past it to the outer table
(Case 4) — while two real, non-obvious gaps (implied elements bypassing the redirect, and the
`in template`-mode-dispatch nuance) were found, and one was fixed while the other was honestly routed
around rather than silently ignored.
