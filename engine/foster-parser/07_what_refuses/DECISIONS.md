# Module 07 — DECISIONS

Line-by-line rationale for `src/nonfoster.js` and `src/dispatch7.js`. Categories as before: **(a)** forced
by spec, **(b)** forced by external contract, **(c)** our own convention.

---

**`<style>`/`<script>`/`<template>` are inserted with plain `insertHtmlElement`, not routed through "in
head"'s actual rule table.**
**(c) our own convention**, and an honest simplification. The real spec says these are "processed with the
in head rules" — a specific, named rule table this engine has never built (Module 01 only ever needed
enough of `in head` to reach `in table`, not a general-purpose version). Plain ordinary insertion happens to
produce the same *tree shape* for this module's test input, because `<style>`'s content ("p{}") contains no
characters our simplified tokenizer would misread — but this is a coincidence of the test input, not a
proof that this engine's `<style>` handling is spec-accurate in general (see the next entry).

**`<style>`/`<script>` content is tokenized by this engine's ordinary character-by-character scanning, not
the spec's RAWTEXT tokenizer state.**
**(c) our own convention, and a real, stated limitation** — not a hidden one. The spec's tokenizer switches
to a RAWTEXT state on seeing `<style>`, which treats everything up to the matching `</style>` as literal
text, `<` included. This course's tokenizer (Module 01) has no such state — it would misinterpret
`<style>a < b</style>` as an end tag partway through. This module's test input (`p{}`) contains no `<`, so
the two tokenizers agree by construction. `ROADMAP.md`'s Tools/Architecture Target names RAWTEXT/RCDATA as
explicitly out of scope; this module doesn't change that, it just documents exactly where the boundary is.

**`<input type=hidden>` is inserted, then immediately popped off the stack — proven not by the tree shape
of the hidden input alone (a void element has no children either way, so popping is invisible there) but
by a *second* test case with trailing content after it.**
**(a) forced by spec.** "Insert the element, then immediately pop it" only has an externally observable
consequence if something checks the current node afterward — which is exactly what a following character
token does. `<table><input type=hidden>x</table>` is chosen specifically because `x`'s fate (fostered, or
trapped inside the input) depends entirely on whether the pop actually happened. This is the same
methodology as Module 03's Scenario A/B: prove a state-machine side effect by constructing an input that
can only pass if the side effect actually occurred, not by inspecting internal state directly.

**Any `<input>` whose `type` is not `hidden` (case-insensitively) is explicitly left unhandled by
`inTableRefusesFostering`, returning `false`.**
**(a) forced by spec.** This is the one branch of the whole "what refuses to be fostered" question that
does the *opposite* of this module's title — an ordinary `<input>` falls through to the anything-else
fallback and IS fostered, exactly like any other unrecognized element. Testing this alongside the hidden
case is what makes the contrast — and the childless-form bug below — legible.

**`<form>` is inserted then immediately popped unconditionally, with no "form element pointer" gating a
second `<form>` from being rejected.**
**(c) our own convention**, an honest, narrow simplification. The real spec's form handling exists
specifically to prevent a *second* nested `<form>` from creating a second form-associated context — this
module's test never has two forms, so the gating logic that distinguishes "first form, allowed" from
"second form, rejected" has nothing to prove here. Implementing it would be exactly the kind of code this
course's engineering conventions warn against: building for a case no test exercises.

**The childless-form test case is chosen deliberately to reproduce the exact bug the attached reference
course calls its "single most reliable source of 'why is my form empty' bug reports."**
**(c) our own convention**, and the module's central teaching example. `<table><form><input name=x></form></table>`
looks, to someone reading the markup, like `input` is inside `form` — visually, in the source, it is. But
because `form` is popped the instant it's created, the current node has already reverted to `table` by the
time `<input>` arrives, and `<input>` (no `type=hidden`) falls straight through to fostering. The result: a
`<form>` with zero children, and an `<input>` that is form-associated (in the real DOM, via the form element
pointer this engine doesn't model) but not a descendant of its own form, ever. This module's test proves the
*tree shape* of that bug; it does not model the form-association side of it, which is a DOM-API-level
consequence this engine's node classes don't represent (Module 00 scoped `ElementNode` without any
form-association fields).

**Comment tokens are inserted via a direct `insertNode(currentNode(state), new CommentNode(...))` call,
bypassing `getAdjustedInsertionLocation` entirely.**
**(a) forced by spec.** "In table"'s rule for a comment token is simply "insert a comment" at the current
node — comments are never subject to foster parenting at all, in any insertion mode. Routing them through
the foster-aware location function would be actively wrong, not just unnecessary.

**A DOCTYPE token is tested directly against `inTableRefusesFostering`, not through the full tokenizer and
`dispatch7`.**
**(c) our own convention.** A DOCTYPE token appearing after the document's real doctype (mid-table) is a
rare, deliberately-synthetic case — testing it end-to-end would require constructing markup no realistic
input would ever contain. Calling the function directly with a hand-built token and state (the same
technique Module 02 and Module 04 used) proves the same claim more directly.

**`dispatch7.js` duplicates the enable/disable `try`/`finally` bracket from Module 05's `dispatch5`, rather
than extracting it into a function Module 05 would need to export retroactively.**
**(c) our own convention.** Module 05 is already fully documented and browser-verified; retroactively
refactoring its internals — even in a behavior-preserving way — would mean re-running and re-checking
everything `05_seven_substeps/DECISIONS.md` already claims as verified, for the sake of avoiding three
duplicated lines. The duplication is small, contained, and explicitly called out here rather than hidden.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| `<style>`/`<script>`/`<template>` use plain insertion, not real "in head" rules | (c) convention | No general "in head" rule table exists; coincidentally correct for this test's simple content |
| No RAWTEXT tokenizer state | (c) convention, stated limitation | Explicitly out of scope per `ROADMAP.md`; test input chosen to avoid the gap |
| Hidden-input pop proven via trailing content, not internal inspection | (a) spec | Only way to observe an invisible-on-void-elements side effect |
| Non-hidden `<input>` explicitly falls through to fostering | (a) spec | The deliberate contrast case that makes the childless-form bug legible |
| `<form>` popped unconditionally, no form-pointer gating | (c) convention | No test case has two forms; nothing to gate |
| Childless-form bug reproduced as this module's central example | (c) convention | Matches the attached reference course's own stated real-world relevance |
| Comments bypass the foster-aware location function entirely | (a) spec | Comments are never subject to foster parenting, in any mode |
| DOCTYPE-mid-table tested directly, not end-to-end | (c) convention | Avoids constructing unrealistic markup for a rare synthetic case |
| `dispatch7` duplicates Module 05's enable/disable bracket | (c) convention | Avoids retroactively touching an already-verified module |

## What We Proved

Running `node test/demo.js` (real output, captured verbatim):

```
── <style> stays inside the table ──
body
  table
    style
      #text "p{}"

── <input type=hidden> stays inside; content AFTER it is still fostered (proves the pop happened) ──
body
  #text "x"
  table
    input

── <input type=text> (not hidden) IS fostered ──
body
  input
  table

── The childless-form bug: <form> ends up empty inside the table; its own <input> is fostered OUTSIDE it ──
body
  input
  table
    form

── A comment stays inside the table ──
body
  table
    #comment "hi"

── A DOCTYPE token mid-table: parse error, ignored, table stays childless ──
handled: true | table.children.length: 0

OK — all assertions passed. Module 07 "what refuses to be fostered" verified against real browser output.
```

Five of six checks were verified against live browser `DOMParser` output before this engine was run against
the same inputs. Together they prove the central claim of this module's title: "what refuses to be
fostered" is not one rule but five *different* rules, each intercepting the anything-else fallback for its
own reason — and one input shape (`<input>` with no `type=hidden`) proves the fallback is still reachable
even from right next to all five, which is exactly what produces the childless-form bug.
