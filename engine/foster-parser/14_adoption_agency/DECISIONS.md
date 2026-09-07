# Module 14 — DECISIONS

Line-by-line rationale for `src/special_category.js`, `src/location_override.js`,
`src/adoption_agency.js`, `src/dispatch14.js`. Categories as before: **(a)** forced by spec, **(b)**
forced by external contract, **(c)** our own convention. Added to the course after the original 00–13
roadmap, by explicit request, to cover the one algorithm every prior module had deliberately scoped out.

---

## This module's build was unusually error-prone — on purpose, this section says so directly

This is the single hardest algorithm in the whole HTML parsing spec, and building it produced more real,
caught-and-fixed mistakes than any other module in this course. That is reported here in full, in the
order it happened, because the corrections are more instructive than a clean first draft would have been —
and because quietly polishing them away would contradict the one rule this entire course has followed
since Module 01's first bug.

**Mistake 1 — a genuine gap in `insertNode` (Module 00), never needed until now.** Every one of the 19
prior modules only ever inserted freshly created nodes. This module is the first thing in the whole course
that needs to *move* an already-parented node — steps that relocate `furthestBlock`'s children, and the
node being carried through the inner loop's clone chain. Calling plain `insertNode` for either left the
node referenced by both its old and new parent's children arrays at once, which is what turned one clone
into an exponentially duplicating tree (verified: an 8-level-deep, branching mess of nested `<b>` tags for
a simple two-element misnesting). Fixed with a local `moveNode` helper (detach from old parent, then
insert) — not by editing Module 00's file, same additive pattern as every module since 03.

**Mistake 2 — trusting a too-literal reading of spec prose over what the spec actually implies.** The
current WHATWG text for the relocation step reads: *"Let insertionLocation be commonAncestor, after its
last child, if any. Insert whatever lastNode ended up being... at the adjusted insertion location given
insertionLocation."* Read literally, this looks like it bypasses the foster-parenting gate entirely — and
an early draft of this module rewrote `location_override.js` on exactly that assumption, deleting the
gate-aware code that had been correct from the start. **This was checked, not assumed** — against
[parse5's actual source](https://github.com/inikulin/parse5) (a battle-tested implementation used by
jsdom), fetched directly during this build. Its `aaInsertLastNodeInCommonAncestor` function explicitly
tests `_isElementCausesFosterParenting(commonAncestor)` before deciding whether to foster-parent or
ordinary-append. The gate DOES apply. The "simplification" was reverted; the original, fuller
`getAdjustedInsertionLocationFor` is what ships. Verified directly by Case 3 below, where `commonAncestor`
(`body`) is *not* table-family, so this specific test can't distinguish the two readings on its own — the
correction is trusted because of the primary-source check, not because a test happened to pass either way.

**Mistake 3 — the actual cause of an 8-iteration infinite-seeming loop: stack insertion direction.** The
same spec sentence — *"insert the new element into the stack of open elements immediately below the
position of furthestBlock"* — was implemented as "immediately before furthestBlock" in array terms
(leaving furthestBlock as the current node). That produced a real, reproduced bug: the outer loop's second
iteration found the exact same `furthestBlock` again and cloned a second time, then a third, up through the
8-iteration cap, producing 8 nested `<b>` elements for input that a real browser resolves in one pass.
**Checked against parse5's source again**: `openElements.insertAfter(furthestBlock, newElement, ...)` —
the new element goes *after* furthestBlock, becoming the new current node. With that fix, the second outer
loop iteration's furthest-block search starts *at* the formatting element itself, finds nothing below it,
and the "no furthest block" branch correctly terminates the loop after exactly one clone-and-relocate pass.

**Mistake 4 — two self-inflicted test failures from misreading my own captured output.** After all three
structural fixes above, Cases 2 and 3 still "failed" — but the engine's output was correct both times; the
test file's *hand-transcribed* expected trees were wrong, because an indentation-based ASCII dump is easy
to miscount by eye. Both were re-verified using a `parentElement`-labeled serializer (`node (parent=X)` per
line, removing all ambiguity) run live against the real browser, confirming the engine's original output —
not the hand-transcribed expectation — was right both times. The lesson generalizes past this module: even
a "verify against real output" methodology can fail if the *transcription* of that real output introduces
an error nobody re-checked. Re-verifying with an unambiguous serializer, rather than trusting a first
eyeballed reading, is what caught it.

## `src/special_category.js`

**The full spec list is reproduced, not trimmed to this module's own test cases.**
**(c) our own convention**, a deliberate exception to this course's usual narrow-scoping habit. Every other
"scope-narrowing" decision in this course (e.g. Module 04's five-element atlas, Module 10's
`FORMATTING_ELEMENTS`) trims a list to exactly what's tested because the *narrowing itself* is part of the
lesson. Here, trimming would risk silently changing which of a *reader's own* test inputs trigger cloning —
and the list costs nothing extra to keep complete (a flat `Set`, no attached behavior).

## `src/location_override.js`

Covered above (Mistake 2). The file that ships is the one built on the first attempt, restored after being
incorrectly "simplified" and then re-verified against real reference-implementation source.

## `src/adoption_agency.js`

**The inner loop walks the stack by explicit index (`cursor`), decrementing once per iteration, rather
than re-deriving a position from a node reference each time.**
**(a) forced by spec**, and directly informed by the spec's own footnote: *"the element that was
immediately above node in the stack of open elements before node was removed"* — acknowledging a node can
be removed from the stack mid-loop. Re-querying `indexOf(node)` after removal returns `-1`; walking by
index (which removals *below* the cursor never disturb) sidesteps the problem entirely, confirmed against
parse5's `nextElement` pattern (computed *before* any removal in that iteration, for the same reason).

**The `>3` pruning branch (dropping a node from the active formatting list if the inner loop has run more
than three times) is implemented but only lightly exercised** — none of this module's three test cases
have a misnesting deep enough to trigger it.
**(c) our own convention, an honest limitation**, consistent with Module 10's decision not to implement the
related Noah's Ark clause for the *same* underlying reason: no test case needs it, and building deeper
verification for an untested branch would be exactly the kind of code this course's conventions warn
against writing speculatively.

## `src/dispatch14.js`

**A local, extended `FORMATTING_ELEMENTS_14 = new Set([...FORMATTING_ELEMENTS, 'i'])`, rather than adding
`'i'` to Module 10's shared, already-verified `FORMATTING_ELEMENTS` in place.**
**(c) our own convention.** Module 10's `Set` is a shared, mutable object imported by every module since —
mutating it in place would silently change behavior for all of them. Case 1 (the classic `<b>`/`<i>`
textbook overlap) genuinely needs `'i'` recognized as a formatting element too, since its whole point is
showing two *different* formatting elements interacting — so this module builds its own superset and its
own dispatch chain around it, the same escalation pattern every module since 05 has used whenever it needed
different insertion behavior than the module before it.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| `moveNode` helper added locally (detach-then-insert) | (c) convention, bug fix | `insertNode` never needed to move already-parented nodes before this module |
| Foster-parenting gate DOES apply to `commonAncestor` | (a) spec, verified against parse5 | An over-literal prose reading suggested otherwise; checked, not assumed |
| New clone inserted AFTER furthestBlock in the stack | (a) spec, verified against parse5 | The actual fix for the 8-iteration runaway-cloning bug |
| Inner loop walks by explicit index, not by re-deriving position | (a) spec | Spec's own footnote on nodes removed mid-loop |
| `SPECIAL_CATEGORY` kept complete, not trimmed | (c) convention (exception to usual habit) | Narrowing it would change which reader inputs trigger cloning |
| `>3` pruning implemented but lightly tested | (c) convention, honest limitation | No test case needs deep-enough misnesting to exercise it |
| Local `FORMATTING_ELEMENTS_14` superset, not a shared mutation | (c) convention | Protects every prior module's already-verified behavior |
| Two test-expectation transcription errors caught and fixed | — | Re-verified with an unambiguous `parent=X` serializer rather than trusting an eyeballed diff |

## What We Proved

Running `node test/demo.js` (real output, captured verbatim):

```
── Case 1: <b>1<i>2</b>3</i>4 — the "no furthest block" path (plain pop, no cloning) ──
body
  b
    #text "1"
    i
      #text "2"
  i
    #text "3"
  #text "4"
log: no-furthest-block → no-furthest-block

── Case 2: a structural element (<div>) misnested inside <b> — full clone-and-relocate ──
body
  div#outer
    b
      #text "bold"
    div#inner
      b
        #text "block"
      #text "after"
    #text "more"
log: cloning → no-furthest-block

── Case 3: a <table> misnested inside <b> — cloning meets foster parenting ──
body
  b
    #text "boldaftermore"
    table
log: enable → disable → formatting-element-not-in-scope → enable → disable

OK — all assertions passed. Track 1 Module 14 adoption agency algorithm verified against real browser output.
```

All three trees were independently verified against live browser `DOMParser` output — twice each, in
Cases 2 and 3, after the transcription errors above were caught. Together they prove: the textbook
`<b>`/`<i>` overlap example does *not* trigger the algorithm's famous cloning machinery at all (Case 1); a
genuinely misnested structural element does, producing exactly the clone-and-relocate tree shape the
algorithm exists for (Case 2); and that same machinery composes correctly with foster parenting when the
misnested element is table-family, with zero special-casing between the two mechanisms (Case 3) — the
override-target mechanism described, in the abstract, earlier in this course's own chat history, finally
given a real, working, tested caller.
