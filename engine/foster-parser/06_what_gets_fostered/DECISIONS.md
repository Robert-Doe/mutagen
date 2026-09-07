# Module 06 — DECISIONS

Line-by-line rationale for `src/foreign.js`. Categories as before: **(a)** forced by spec, **(b)** forced
by external contract, **(c)** our own convention.

---

## The 2013 bug this module is really about

An early HTML5 draft stated outright that "insert a foreign element" was unaffected by foster parenting,
reasoning that its current node is always a non-HTML element by the time a foreign element is being
inserted. That reasoning was wrong for exactly one input shape: `<table><math>`, where the current node at
the moment `<math>` is inserted is the HTML `table` element itself — not yet anything foreign. Nolan Waite
reported this to the whatwg mailing list in July 2013; Ian Hickson ("Hixie") confirmed it and fixed the
spec text. The corrected, current behavior — foreign elements foster exactly like HTML elements do — is
what this module verifies against a real browser.

**`insertForeignElementAtAppropriatePlace()` is a thin alias for `insertElementAtAppropriatePlace()`, not
a fresh reimplementation, and not a re-export under a new name either.**
**(c) our own convention**, and the central design decision of this module. Three options existed: (1)
re-export Module 05's function directly under a new name (`module.exports.insertForeignElementAtAppropriatePlace = insertElementAtAppropriatePlace`),
(2) reimplement the same logic independently, or (3) a one-line wrapper function that calls through. Option
1 would be marginally more honest about "these are literally the same code," but would make it look like a
coincidence of module organization rather than a stated claim; option 2 would violate the single-source-of-
truth rule this course has followed since Module 01, and would also make it *possible* for the two to
silently drift apart — exactly the kind of divergence the real 2013 bug was about (the spec's foreign-
element algorithm and its HTML-element algorithm were allowed to say different things, and one of them was
wrong). A named wrapper function states the equivalence as a deliberate fact in the code, and this module's
demo separately proves it structurally (see below) rather than only by coincidence of matching output.

**This engine does not add a namespace field to `ElementNode` to distinguish `<math>`/`<svg>` from
ordinary HTML elements.**
**(c) our own convention**, consistent with Module 00's original scoping decision (`DECISIONS.md`: "four
node kinds... deliberately narrower than the full DOM node type list"). The real spec's foreign-element
algorithm does real namespace bookkeeping (adjusting attribute names/cases per-namespace, tracking the
element's `namespaceURI`) that affects things this course's engine never needs to get right — CSS
rendering, `getAttributeNS`, SVG-specific attribute case-sensitivity. The ONE question this module answers
— does a foreign element's *insertion location* differ from an HTML element's? — doesn't require any of
that bookkeeping to answer correctly, which is exactly why the corrected spec text says the two algorithms
converge on the same "appropriate place" call.

**The demo includes a "structural check" (comparing two hand-built probe states) in addition to the three
real-browser-verified cases.**
**(c) our own convention**, added because matching real browser output for `<table><math></math></table>`
proves the *externally observable result* is correct, but doesn't by itself prove *why* — a coincidentally
correct but independently-reimplemented foreign-element algorithm would pass that check too. The structural
probe directly demonstrates that an HTML element and a foreign element, given byte-identical parser state,
land in byte-identical relative positions — which is the actual claim this module's roadmap entry makes
("route through the same relocation path"), stated as its own assertion rather than inferred from output
matching alone.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| Thin wrapper function, not a re-export or reimplementation | (c) convention | States the equivalence as a fact in code; keeps one source of truth |
| No namespace field added to `ElementNode` | (c) convention | Not needed to answer this module's one question; consistent with Module 00's scoping |
| Structural probe added alongside real-browser-verified cases | (c) convention | Proves the mechanism is shared, not just that the output happens to match |

## What We Proved

Running `node test/demo.js` (real output, captured verbatim):

```
── Structural check: foreign-element insertion IS HTML-element insertion ──
OK: identical relocation for an HTML element and a foreign element given the same table-family current node.

── Case A: <table><math></math></table> ──
body
  math
  table

── Case B: <table><svg></svg></table> ──
body
  svg
  table

── Case C: mixed HTML element + foreign elements + character, source order ──
body
  div
  math
  #text "x"
  svg
  table

OK — all assertions passed. Module 06 "what gets fostered" verified against real browser output.
```

Cases A and B were independently verified against a live browser's `DOMParser` before this engine was run
against them (see this module's browser-verification session, same methodology as Module 05); Case C
extends the check to a single input mixing an ordinary HTML element, two foreign elements, and a lone
character token, all fostering into the same relative position in strict source order — directly
confirming the attached reference course's own claim that "consecutive fostered nodes accumulate in source
order." Module 05's `dispatch5` engine required **zero changes** to get all three cases right — because it
never special-cased HTML-vs-foreign in the first place, it was already correct by construction, in exactly
the way the corrected 2013 spec text says it should be.
