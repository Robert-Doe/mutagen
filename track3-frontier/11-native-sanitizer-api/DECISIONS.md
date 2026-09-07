# DECISIONS — Module 11: The Native Sanitizer API

**(a)** spec/platform-forced · **(b)** contract-forced · **(c)** our convention.

## `setHTMLModel` returns a TREE, never a string

**(a)** This is the whole point. `Element.setHTML()` (DOM spec, HTML Sanitizer
API) parses once, filters the node tree, and inserts the nodes. There is no
`serialize` in the algorithm. Our model mirrors that: `setHTMLModel` returns the
filtered tree; a caller "inserts" it. Returning a string would reintroduce
exactly the step the API removes.

## We model scripting as ON for the parse

**(b)** `setHTML` parses in the context of a live element, so the
`<noscript>` content model matches what the element would get from `innerHTML` —
which is why the API closes Module 4 for free. (Script *execution* is separately
blocked during the parse; our model doesn't run scripts anyway.)

## The vector list is imported from Module 8, not re-typed

**(c)** `ALL_VECTORS` lives in `track2-mxss/08-hardened-sanitizer/src/hardened.mjs`
and Module 11 imports it. One source of truth for "every attack this course
produced"; if a vector is added later, both modules pick it up.

## `setHTMLUnsafe` is modelled as "parse, no filter"

**(a)** Per spec, `setHTMLUnsafe` / `parseHTMLUnsafe` parse without sanitising
(they still don't execute scripts during parse, and still process declarative
shadow DOM). The test asserts two things: a plain `<img onerror>` survives (it
doesn't filter), and it is *still* a single parse (no mXSS). The residual risk is
ordinary DOM XSS from caller error, which is a different course.

## The brain exercise carries the real caveat

**(c)** `setHTML({ sanitizer: { elements: ['style'] } })` re-opens Modules 3/5
*inside* the safe API, because a later `.innerHTML` read of that subtree
serialises the mutating element. The module says so explicitly rather than
leaving "just use setHTML" as an unqualified takeaway.

## What We Proved

- All 12 course vectors are inert through `setHTMLModel` — and through the real
  `Element.setHTML()` in Chrome 148 (`proof.html`: zero handlers fired).
- Benign markup (`<p><b><a>`) survives with structure intact.
- `setHTMLUnsafe` does not sanitise but is still single-parse (mXSS-immune).
- The immunity is structural: no serialize step ⇒ no second parse ⇒ no
  sink-differential to exploit.
- 16/16 assertions pass.
