# DECISIONS — Module 8: The Hardened Sanitizer

**(a)** spec/platform-forced · **(b)** contract-forced · **(c)** our convention.

## Explicit `do…while`-style loop, even though modern DOMPurify removed theirs

**(c)** DOMPurify dropped its `do { _sanitize } while (dirty)` because rebuilding
from a stable serialisation plus a clobber/mutation re-check gives the same
guarantee. We keep the loop because it is the clearest *statement* of the safety
property: **the string we ship must parse back into itself.** A learner who sees
the loop understands why non-idempotency (Module 2) is a security problem.
Replaceable by DOMPurify's approach; not by "just one pass".

## Loop caps at `max` (default 6) and THROWS on no fixed point

**(c)** A string that keeps changing under re-sanitisation cannot be vouched for.
Throwing forces the caller to decide (reject the input / raise the cap with a
reason) rather than silently shipping an unchecked string. 6 is empirical — every
construct in this course settles in ≤2; 6 is generous headroom.

## Forbidden list drops the SUBTREE; allow-list miss UNWRAPS

**(a) + (c)** `style script xmp noscript noembed noframes iframe title textarea
template mglyph malignmark annotation-xml` are dropped with their contents
because their *contents* are the hazard (raw text, mis-namespaced children,
inert fragments). Everything else not on the allow-list is unwrapped so benign
wrappers (`<section>`, `<article>`) don't destroy their content. This mirrors
DOMPurify's `FORBID_CONTENTS` vs default unwrap.

## Namespace gate is absolute: `child.ns !== HTML` → gone

**(a)** No SVG/MathML element survives, full stop. This is stricter than
DOMPurify's default (which allows a curated SVG/MathML subset via
`_checkValidNamespace`) — a deliberate simplification for the teaching version.
Documented so a reader knows the trade-off: no inline SVG shapes, in exchange for
a one-line rule instead of a namespace-membership table.

## `<image>` → `<img>` before the allow-list check

**(a)** The HTML parser itself aliases `<image>`. Canonicalising the name before
the check means the allow-list stores one spelling. DOMPurify does the same.

## Attribute scrub runs on EVERY surviving node, after promotion

**(a)** A node promoted out of a removed parent (Module 5) must still face the
attribute allow-list. Because the walk processes the promoted children in the
same `out` pass, this is automatic — but the test asserts it explicitly, because
it is the exact thing naive sanitizers get wrong.

## Decisions We Made

| Decision | Category | Alternative |
|---|---|---|
| explicit fixed-point loop | (c) | DOMPurify's stable-rebuild + re-check |
| throw on no fixed point | (c) | ship last output; loop forever |
| forbidden list drops subtree | (c) | unwrap everything |
| absolute namespace gate | (c) | curated SVG/MathML subset (DOMPurify default) |
| `<image>`→`<img>` normalise | (a) | list both spellings |

## What We Proved

- All **12** attack vectors from Modules 3–7 produce output that is inert after a
  scripting-on browser re-parse.
- Four benign HTML samples pass through with element structure unchanged.
- The loop reaches a fixed point for the classic `<svg><style>` payload (does not
  throw); `hardenedSanitizer(hardenedSanitizer(x)) === hardenedSanitizer(x)`.
- Forbidden elements are dropped with their subtrees; no SVG/MathML element
  survives.
- 20/20 assertions pass.
