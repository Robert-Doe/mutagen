# Module 04 — DECISIONS

Line-by-line rationale for `src/atlas.js`. Categories as before: **(a)** forced by spec, **(b)** forced by
external contract, **(c)** our own convention.

---

**The atlas includes `colgroup`, `col`, and `div` even though none of them can naturally reach
`isFosterParentingTarget()` as the current node through this engine's actual dispatch loop yet.**
**(c) our own convention**, and the most important honesty call in this module. `checkTarget()` builds a
minimal synthetic state — `{ fosterParentingEnabled: true, stack: [new ElementNode(tag)] }` — rather than
driving a real parse. For `table`/`tbody`/`thead`/`tfoot`/`tr`/`td`/`th`/`caption`, this synthetic state is
representative of a real reachable parser state (Modules 01–03 can and do put each of those as current
node for real). For `colgroup` and `col`, it is **not** representative — no mode implemented so far would
ever make either the current node while the flag is live, because the real spec routes around that
possibility entirely (colgroup is popped-and-reprocessed before it can be; col is a void element that
never stays on the stack). Their rows are included anyway, with `reason` fields that say so explicitly
("spec mechanism (not yet built here)"), because the atlas's job is to be a complete map of the *content
model* question ("would a stray node have anywhere to go here?"), not just a map of what this engine's
current dispatch loop can produce. Silently omitting them would make the five-element derivation look
narrower and more arbitrary than it is.

**`checkTarget()` reuses Module 02's `isFosterParentingTarget()` unmodified, rather than reimplementing a
membership check locally.**
**(c) our own convention**, consistent with every module since 01: one source of truth for the predicate.
This module's job is to *exercise* that predicate against a wider input set, not to duplicate its logic.

**The atlas is a flat array of `{ tag, fosters, reason }` objects, not a `Map` or a class.**
**(c) our own convention.** Nothing here needs `Map`'s O(1) lookup (the whole array is iterated exactly
once, per test) or a class's identity/mutation semantics (Module 00's rationale for classes doesn't apply
— these are static, read-only rows). A plain array of plain objects is the least machinery that does the
job, and it iterates naturally with `for...of` for the demo's printed table.

**`div` is included as a negative control, even though it's the atlas's only fully non-table-related row.**
**(c) our own convention**, added deliberately rather than left implicit. Without at least one element
that's obviously unrelated to tables at all, a reader could reasonably wonder whether `checkTarget()`
secretly returns `true` for *anything* it doesn't specifically recognize as a non-fosterer — the `div` row
rules that out directly, the same way Module 00's empty-stack test ruled out a different silent-failure
mode for a different function.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| `colgroup`/`col` rows included with an honest "not yet mechanically enforced" reason | (c) convention | Completes the content-model picture without overclaiming what the engine currently does |
| `checkTarget()` reuses `isFosterParentingTarget()` unchanged | (c) convention | One source of truth for the predicate, consistent since Module 01 |
| Atlas is a flat array of plain objects | (c) convention | No `Map`/class benefit applies to static, once-iterated rows |
| `div` included as a negative control | (c) convention | Rules out "returns true for anything unrecognized" as a silent failure mode |

## What We Proved

Running `node test/demo.js` (real output, captured verbatim):

```
── Testing every table-family element (and one control) as current node ──

<table>      → true   OK        CSS display:table generates no box capable of holding non-table content
<tbody>      → true   OK        CSS display:table-row-group has no box that isn't made of rows
<thead>      → true   OK        CSS display:table-header-group has no box that isn't made of rows
<tfoot>      → true   OK        CSS display:table-footer-group has no box that isn't made of rows
<tr>         → true   OK        CSS display:table-row has no box of its own that isn't made of cells
<td>         → false  OK        content model is flow content — a cell hosts anything
<th>         → false  OK        content model is flow content — a header cell hosts anything
<caption>    → false  OK        content model is flow content — same reasoning as td/th
<colgroup>   → false  OK        spec mechanism (not yet built here): popped and reprocessed into "in table" before it can ever be the current node while the flag is live
<col>        → false  OK        spec mechanism (not yet built here): a void element, never stays on the stack long enough to be a target
<div>        → false  OK        not table-related at all — included as a control case

Elements that foster: table, tbody, tfoot, thead, tr (5 of them)
OK — all assertions passed. Module 04 five-element derivation verified.
```

This proves, against eleven distinct current-node values (not just the four of Module 02's truth table),
that `isFosterParentingTarget()`'s answer for every table-related element matches the content-model
reasoning the attached reference course's own Module 02 gives in prose: the five that foster are exactly
the ones with no box of their own to host a stray node in; the near-misses that don't foster (`td`, `th`,
`caption`) are the ones whose content model is flow content; and the two structurally-excluded near-misses
(`colgroup`, `col`) are excluded by a different spec mechanism entirely, honestly marked as not yet built
in this engine. Module 05 gives the five elements that *do* foster a real destination to relocate a node
to.
