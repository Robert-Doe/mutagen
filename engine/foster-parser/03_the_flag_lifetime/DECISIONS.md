# Module 03 — DECISIONS

Line-by-line rationale for `src/lifecycle.js`, plus the one additive change to Module 01's `dispatch.js`.
Categories as before: **(a)** forced by spec, **(b)** forced by external contract, **(c)** our own
convention.

---

## The distinction this module is really about

The spec's exact words for "in table" mode's anything-else clause: *"Enable foster parenting, process the
token using the rules for the 'in body' insertion mode, then disable foster parenting."*

**"Process the token using the rules for the in body insertion mode" does not mean "switch the insertion
mode to in body."** **(a) forced by spec.** §13.2.4.1 defines "process the token using the rules for X
insertion mode" as a distinct technique from an actual mode switch: it means invoke X's rule table for
this one token, and if X's own rule for that specific token happens to include an explicit mode switch (as
in body's `<table>` rule does — see Module 01), that switch takes effect. But if X's rule for that token
does *not* mention switching modes (as in body's plain-character rule doesn't), the insertion mode
variable is simply never touched, and remains whatever it was before — here, `in table`.

Getting this backwards is an easy, natural-looking mistake: writing `state.mode = 'in body'` before
invoking the rules, then restoring or not restoring it afterward, would make the mode variable say
something the spec never asked it to say, and would make "is currently in table mode" checks elsewhere
in the engine unreliable during a fallback. This module's `inTableAnythingElse()` instead calls
`MODES['in body'](token, state)` **directly**, bypassing `state.mode` and `dispatch()`'s lookup entirely —
so the only way `state.mode` changes is if in body's own rule for that token says so, exactly matching the
spec's phrasing.

## The additive change to Module 01

**`dispatch.js` now exports `MODES` in addition to its previous exports.**
**(c) our own convention**, and the one place this module edits an earlier module's file rather than only
adding new files. Justified narrowly: no existing behavior changes (the new export is purely additive —
Modules 00–02's own demos were re-run after this change and still pass unmodified, see `REFERENCES.md`
entry for this module), and there was no way to get the semantics above right without direct access to a
single mode's rule table, which only `MODES` provides. The alternative — duplicating in body's rule logic
inside Module 03 — would violate the single-source-of-truth principle this course's engine has followed
since Module 01.

## `src/lifecycle.js`

**`inTableAnythingElse()` disables the flag inside a `finally` block, not just after a normal return.**
**(a) forced by spec.** The spec's phrasing — enable, process, disable — states no exception for
processing that goes wrong. A naive `try`-less implementation (enable; process; disable) would leave the
flag stuck `true` forever if the wrapped call threw, corrupting every later check of
`isFosterParentingTarget()` (Module 02) for the rest of the parse. `finally` is the only construct that
disables the flag on both the success and failure paths without duplicating the disable line.

**The underlying error is allowed to propagate after the `finally` block runs, not swallowed.**
**(c) our own convention**, chosen for the same reason as Module 01's `NotImplementedYet`: this engine
fails loudly at its capability boundary rather than pretending to have succeeded. Scenario A's demo proves
both halves of this at once — the flag is safely disabled, *and* the caller still learns the underlying
in-body rule was missing.

**`dispatchWithFosterParenting()` is a new function, not a modification of Module 01's `dispatch()`.**
**(c) our own convention**, consistent with every prior module: Module 01's `dispatch()` is untouched and
still does exactly what it did in Module 01's own tests. Module 03 adds a second, foster-parenting-aware
entry point that delegates to the original for every mode except `in table`.

**`log` is an optional callback parameter (`(event) => void`), not a hardcoded `console.log`.**
**(c) our own convention.** Baking `console.log` calls into `lifecycle.js` would make the enable/disable
sequence untestable without capturing stdout. A callback lets the demo collect `['enable', 'disable']`
into a plain array and assert on it directly — the same pattern Module 00 used for building a tree the
demo could assert against, rather than only printing it.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| Call `MODES['in body']` directly, never touch `state.mode` | (a) spec | "Process using the rules for X" ≠ "switch to X" — a real, easy-to-get-backwards spec distinction |
| Export `MODES` from Module 01's `dispatch.js` | (c) convention | Only way to invoke one mode's rules without duplicating logic; verified additive (00–02 still pass) |
| Disable the flag in a `finally` block | (a) spec | "Enable, process, disable" has no stated exception for failure |
| Let the underlying error still propagate | (c) convention | Fail loudly at the capability boundary; don't hide a real gap behind a safely-reset flag |
| `dispatchWithFosterParenting()` is additive, not a rewrite of `dispatch()` | (c) convention | Every module before this one still runs unmodified |
| Enable/disable events reported via callback, not `console.log` | (c) convention | Makes the bracketing sequence directly assertable, not just visually inspectable |

## What We Proved

Running `node test/demo.js` (real output, captured verbatim):

```
── Reached mode "in table" (current node <table>) at token #6: </table> ──

── Scenario A: fallback token that in body ALSO can't handle ──
log: enable → disable
flag after: false
mode after: in table (must still be "in table" — in body's rules never touched it)

── Scenario B: fallback token that in body CAN handle ──
log: enable → disable
flag after: false
mode after: in table (must still be "in table")

OK — all assertions passed. Module 03 flag lifetime verified.
```

This proves, on both a failure path (Scenario A: `</table>`, which in body also can't handle) and a
success path (Scenario B: a whitespace character, which in body handles by inserting it):

1. The flag is `undefined`/unset before any fallback ever runs.
2. Exactly one `enable` and exactly one `disable` bracket each single-token attempt — never more, never
   fewer, and never spanning two tokens.
3. The flag is `false` again immediately afterward, regardless of whether the wrapped attempt succeeded or
   threw.
4. `state.mode` is **never** changed by the act of enabling/processing/disabling itself — only an explicit
   mode-switch inside the rule being borrowed (which neither `</table>` nor a character token triggers)
   would change it. This is the subtle spec distinction this module exists to get right.

Module 02's gate predicate and this module's lifecycle now compose correctly: the flag Module 02 could
only set by hand is now set automatically, for exactly one token, by exactly one caller. Module 04 uses
this same wiring to test all five table-family elements as current node, one at a time.
