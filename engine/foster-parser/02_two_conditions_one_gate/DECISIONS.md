# Module 02 — DECISIONS

Line-by-line rationale for `src/foster.js`. Categories as before: **(a)** forced by spec, **(b)** forced
by external contract, **(c)** our own convention.

---

**The five-element membership list is a `Set`, frozen.**
**(c) our own convention.** An array with `.includes()` would work identically in behavior but is O(n) per
check and, unfrozen, could be silently mutated by a later module's typo (e.g. `FOSTER_PARENT_TARGETS.push(...)`
somewhere unrelated). `Object.freeze` turns that class of bug into a thrown `TypeError` at the mutation
site instead of a silent, hard-to-trace membership-list corruption discovered three modules later.

**`isFosterParentingTarget()` is a pure function — it reads `state.fosterParentingEnabled` and
`state.stack`, but never sets them, throws, or logs.**
**(c) our own convention**, and the central design decision of this module. The real spec states the two
conditions as step 2 of one larger algorithm ("appropriate place for inserting a node"), inseparable in
the prose from the substeps that follow. We deliberately extract just the *predicate* into its own
function precisely so it can be unit-tested against a truth table independent of two things that don't
exist yet in this engine: a real enable/disable lifecycle for the flag (Module 03), and a real destination
for a fostered node (Module 05). Building the whole algorithm at once here would make it impossible to
verify the gate condition in isolation — a bug in the (not-yet-built) relocation logic could hide a bug in
the (this module's) gate logic, or vice versa.

**`state.fosterParentingEnabled` is added by simply setting a property on the object Module 01's
`createParserState()` returns — Module 01's `dispatch.js` is not modified at all.**
**(c) our own convention.** JavaScript objects are open by default; a later module extending an earlier
module's state shape doesn't require editing the earlier module's file, as long as the earlier module
never assumes a *closed* set of fields (Module 01's `dispatch.js` never does — it only reads `.stack`,
`.mode`, `.document`). This keeps every module's `src/` directory a pure *addition* on top of the ones
before it, never a modification — which is also why this module's demo can `require()` Module 01's files
completely unchanged.

**The demo swaps `state.stack[state.stack.length - 1]` directly to change the current node for each
truth-table row, rather than driving the real tokenizer/dispatch loop through four separate inputs.**
**(c) our own convention, deliberately mixed with real engine state.** The demo does start from one real
parse (proving the predicate is exercised against genuine engine output, not a hand-rolled mock, for at
least the first row) and then manipulates the stack directly for the remaining three rows, because driving
the real dispatch loop to produce a `<td>` current node would require `in table`/`in row`/`in cell` rules
that don't exist until Modules 02–13 collectively build them — exactly the bootstrapping problem this
predicate-first module structure is designed to avoid.

**The empty-stack case is tested explicitly, even though no Module 02 test case naturally produces one.**
**(c) our own convention, added deliberately rather than reactively.** `target` being `undefined` when the
stack is empty is a real state Module 11 (fragment parsing) will produce; testing that `isFosterParentingTarget`
degrades to `false` rather than throwing `Cannot read properties of undefined` costs one assertion now and
avoids a confusing failure surfacing three modules later in an unrelated module's test.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| Five-element list is a frozen `Set` | (c) convention | O(1) lookup; immutability catches accidental corruption immediately |
| Gate extracted as a pure, side-effect-free predicate | (c) convention | Testable independent of flag lifecycle (Module 03) and relocation (Module 05) |
| Flag added as a plain field on Module 01's state object | (c) convention | Every module only ever adds to shared state, never edits an earlier module |
| Demo grounds in a real parse, then manipulates state directly | (c) convention | Avoids needing `in table`/`in row`/`in cell` rules that don't exist yet |
| Empty-stack case tested explicitly | (c) convention | Pre-empts a confusing failure in Module 11 (fragment parsing) |

## What We Proved

Running `node test/demo.js` (real output, captured verbatim):

```
── Real Module 01 engine state reached ──
current node: table | mode: in table

── Truth table: isFosterParentingTarget(flag, currentNode) ──
flag OFF, current node is <table>  → false
flag ON,  current node is <table>  → true
flag OFF, current node is <td>     → false
flag ON,  current node is <td>     → false

Empty-stack edge case (flag ON, no current node) → false (no throw)

OK — all assertions passed. Module 02 two-condition gate verified.
```

This proves, against a real 2×2 truth table plus an edge case, exactly what the attached reference
course's own Module 00 states in prose: *"Either condition alone does nothing. ... Both, and only both,
trigger relocation."* Three of four combinations are false; only flag-ON-plus-table-family-current-node is
true. Nothing here yet decides *when* the flag turns on (Module 03) or *where* a fostered node actually
lands (Module 05) — this module's only claim is that the gate condition itself is correct in isolation.
