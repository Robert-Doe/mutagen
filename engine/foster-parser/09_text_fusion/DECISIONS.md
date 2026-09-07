# Module 09 — DECISIONS

Unlike every module before it, Module 09 adds **no new source file**. Categories as before: **(a)** forced
by spec, **(b)** forced by external contract, **(c)** our own convention — applied here to what to test and
how, since there's no new mechanism to design.

---

**No new `src/` file for this module.**
**(c) our own convention**, stated as a decision rather than left implicit. The mechanism this module is
about — text-node fusion — was fully built in Module 00 (`tryFuseCharacter`) and has been exercised by
every module since without any special-casing (Module 05's Case 1, Module 08's whitespace-trap case). What
Module 09 adds is not new production code but a more rigorous *kind* of test: every prior module checked
tree **shape** (does the rendered/serialized output match?). This module checks object **identity** (is
the fused text literally the same JavaScript object, mutated in place, rather than a new object that merely
looks the same when serialized?) — the stronger claim the spec actually makes.

**The test captures a direct object reference to the "abc" `TextNode` *before* `<table>` is ever inserted,
then asserts `===` identity against `div.children[0]` after fostering "def" into it.**
**(a) forced by spec.** §13.2.6.1's "insert a character," step 4, says: "if there is a Text node
immediately before the adjusted insertion location, append data to that Text node." That is a mutation of
an existing node, not a description of two nodes that happen to end up holding equal-looking data. A
tree-shape comparison (as every prior module used) is consistent with *either* implementation — this
module's `===` check is the only kind of assertion that actually distinguishes them, and it's the one that
matches what the spec literally says happens.

**Part 2 tests three separate `enable`/`disable` cycles for `x`, `y`, `z`, rather than one loop over an
array (which is how Modules 05 and 08 already exercised fusion).**
**(c) our own convention**, added because a passing test built entirely inside one JavaScript `for` loop
leaves open the question of whether fusion depends on being inside that loop's shared state somehow. Three
independent calls — each with its own enable, insert, disable — prove fusion is a property of the *tree*
(is there a `TextNode` immediately before the insertion point, right now?), not of any calling convention
this engine's own code happens to use to reach it.

**No new live-browser verification was run for this module specifically.**
**(c) our own convention, stated honestly.** Object identity isn't observable through `DOMParser`'s output
the way tree shape is — serializing a real browser's DOM to compare against ours (as every module through
08 did) can only ever prove tree shape matches, never that a real browser's underlying implementation
mutates an existing node rather than replacing it. This module's confidence in the *browser-accuracy* of
identity-preserving fusion rests on §13.2.6.1's explicit wording (quoted above), not on a fresh browser
comparison — Module 05's already-completed browser verification of the "abcdef" tree shape is what this
module builds its stronger identity claim on top of, not a new check.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| No new `src/` file | (c) convention | The mechanism already exists (Module 00); this module strengthens the test, not the code |
| Object-identity (`===`) assertions, not just tree-shape comparison | (a) spec | §13.2.6.1 step 4 literally describes mutating an existing node |
| Three separate enable/disable cycles, not one loop | (c) convention | Proves fusion is a tree property, not an artifact of shared loop state |
| No fresh browser verification | (c) convention, stated honestly | Object identity isn't observable via `DOMParser` output; rests on Module 05's already-verified tree shape plus the spec's explicit wording |

## What We Proved

Running `node test/demo.js` (real output, captured verbatim):

```
── Part 1: object-identity fusion, not just matching output ──
Captured a direct reference to the "abc" TextNode before <table> exists.
After fostering "d", "e", "f":
  div.children.length = 2 (must still be 2 — no new node created)
  div.children[0] === originalTextNode ? true
  div.children[0].data = "abcdef"

── Part 2: fusion survives across SEPARATE fostering events, not just one loop ──
Three separate enable/disable cycles for x, y, z → one text node "xyz". OK.

── Part 3: full engine, real input, same guarantee ──
Full dispatch8 engine on real input: div.children.length = 2 | text = "abcdef"

OK — all assertions passed. Module 09 text-node fusion verified at the object-identity level.
```

This proves the stronger claim tree-shape comparisons alone never could: fostered text doesn't just *look*
merged when serialized, it *is* the same object, mutated in place — exactly matching the spec's literal
wording, and confirming the attached reference course's own observation that "there is no boundary, no
marker, nothing to recover the original split from." Part 3 confirms this guarantee survives unchanged all
the way through the full `dispatch8` engine on real input, not just in isolated unit-style calls.
