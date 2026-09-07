# Module 08 — DECISIONS

Line-by-line rationale for `src/tabletext.js` and `src/dispatch8.js`. Categories as before: **(a)** forced
by spec, **(b)** forced by external contract, **(c)** our own convention.

---

**Buffering is entered whenever a `Character` token arrives while `state.mode === 'in table'` — with no
check for whether the current node is actually `table` itself, versus `tbody`/`tr` (still fostering
candidates), versus `td`/`th` (not fostering candidates at all).**
**(c) our own convention, and a known, analyzed simplification — not an oversight.** The real spec only
buffers characters this way from "in table" mode specifically; "in cell" mode (current node `td`/`th`)
processes character tokens directly via "in body" rules, with no buffering step at all. This engine
collapsed "in cell" into "in table" back in Module 05 (that module's DECISIONS.md), so `dispatch8` cannot
distinguish the two cases by mode name alone.

This turns out not to matter for the *tree shape produced*, and here is the argument why, checked directly
against this module's own first test case (`<td>a</td>`, where `'a'` is buffered and then flushed through
the fostering-eligible path even though it's sitting inside a `<td>`): `handleInTableText`'s flush step
calls `insertCharacterAtAppropriatePlace` for each buffered character, and that function's result depends
on exactly two things at the moment of insertion — the current node's identity, and whether the flag is
enabled. Buffering delays *when* that call happens but never changes *what* the current node is at the time
it happens (buffering never pushes or pops the stack). So for content inside a `td`/`th`, `isFosterParentingTarget`
(Module 02) still correctly returns `false` regardless of whether the flag was spuriously set true during a
buffered flush — exactly the same "harmless spurious enable" property Module 05's DECISIONS.md already
established for `EndTag` popping. The single test case above is the direct proof: `'a'` ends up inside its
`<td>`, correctly, despite having been routed through machinery the real spec would never have used for it.

**`enterInTableText()` and `handleInTableText()` are separate functions, and `handleInTableText()` takes
`dispatchFn` as a parameter instead of `require()`-ing `dispatch8.js` directly.**
**(c) our own convention**, to avoid a circular `require()` between `tabletext.js` (which needs to
reprocess the triggering token through the full dispatcher once buffering ends) and `dispatch8.js` (which
needs to call into `tabletext.js` to handle buffering). Passing the dispatch function in as a parameter —
the same technique Module 03's `log` callback used to avoid a different kind of coupling — breaks the
cycle without either file needing to know the other's internal structure.

**The all-or-nothing decision (`hasNonWhitespace`) is computed once, over the entire buffered array, then
used to choose one of two code paths that both ultimately call the same `insertCharacterAtAppropriatePlace`
in a loop.**
**(a) forced by spec.** This is the literal mechanism the attached reference course's own Module 06
describes as "the all-or-nothing run": the decision is per-run, not per-character, and every buffered
character — including ones that were themselves whitespace — travels together once a single non-whitespace
character anywhere in the run forces the decision.

**Fusion (three separate buffered characters becoming one `TextNode`) is not implemented specially in this
module — it falls out entirely from replaying `insertCharacterAtAppropriatePlace` once per character,
reusing Module 00's `tryFuseCharacter` unchanged.**
**(c) our own convention**, and deliberately so: this module adds no new fusion logic, because none is
needed. The whitespace-trap test case (`"\n  x"` fusing into one text node even though it was tokenized as
four separate `Character` tokens, buffered, then replayed one at a time through the *fostered* insertion
path) is proof that fusion composes correctly with both buffering and fostering without any special-casing
between them.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| Buffering triggers on `mode === 'in table'`, not distinguishing `td`/`th` | (c) known simplification | Provably produces identical tree shape — argued and tested directly above |
| `handleInTableText` takes `dispatchFn` as a parameter | (c) convention | Avoids a circular `require()` between this file and `dispatch8.js` |
| All-or-nothing decision computed once per buffered run | (a) spec | The literal mechanism the spec (and attached reference course) describes |
| No new fusion logic — reuses `tryFuseCharacter` via repeated single-character inserts | (c) convention | Fusion, buffering, and fostering compose correctly with zero special-casing |

## What We Proved

Running `node test/demo.js` (real output, captured verbatim):

```
── The whitespace trap: one non-space character drags the whole buffered run out with it ──
body
  #text "\n  x"
  table
    tbody
      tr
        td
          #text "a"

── Whitespace-only run: inserted inside the table, no parse error, no fostering ──
body
  table
    #text "\n"
    tbody
      tr

── All-whitespace, no following element: still fuses into one text node inside the table ──
body
  table
    #text "   "

OK — all assertions passed. Module 08 "in table text" whitespace trap verified against real browser output.
```

All three cases were independently verified against a live browser's `DOMParser` before this engine was run
against the same inputs (same methodology as Modules 05–07). Together they prove: (1) a single non-whitespace
character anywhere in a buffered run drags every whitespace character in that run out with it, fused into one
text node, landing before the table as usual; (2) a whitespace-only run is never a parse error and stays
inside the table; (3) fusion, buffering, and fostering compose correctly with no code written specifically
to make them cooperate — they were already built to compose, back in Modules 00, 02, and 05.
