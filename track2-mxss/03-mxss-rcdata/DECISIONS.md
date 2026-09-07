# DECISIONS — Module 3: RCDATA / Rawtext Wrapper Removal

**(a)** spec/platform-forced · **(b)** external-contract-forced · **(c)** our convention.

## The module's thesis is a negative result, and that is deliberate

**(c)** Most write-ups present rawtext wrapper removal as a live attack. Against
a correct parse→allow-list→serialize sanitizer in Chrome 148 it is **not** — we
verified it for `style script xmp iframe noembed noframes title textarea`. Rather
than skip the topic or overclaim, the module proves the negative and isolates
the *one serializer step* (`escapeText` on promoted text) the result depends on,
so Modules 4/5/7 can each show what happens when that step is bypassed.

## `STRICT` allow-list excludes `style`/`title`/`textarea`

**(c)** So the sanitizer actually *removes* the wrapper (the scenario under
test). The permissive case (wrapper kept) is a separate test in the same file.

## `throughSanitizerThenBrowser` re-parses the cleaned string with `scripting:true`

**(a)** The sanitizer runs scripting-off (server-side / `DOMParser` / `<template>`
— Module 4 prereq). The browser sink runs scripting-on. Modelling both sides is
the only way to see a mutation.

## We keep the `regexSanitizer` deliberately realistic, not a straw man

**(c)** Its rules (`<script>…</script>` removal, `\son\w+\s*=` stripping,
`javascript:` URL rewriting) mirror what real regex sanitizers actually do. The
two bypasses shown (`/` instead of whitespace; `&#106;avascript:`) are
decades-old and still work — the point is the contrast with the tree walk, which
stops both.

## `serializerEscapesPromotedText` mutates the parsed tree by hand

**(c)** It parses `<w><payload></w>`, lifts the wrapper's text child to the root,
and re-serializes — the minimal model of "sanitizer removed the wrapper, kept
the child". A full sanitizer run gives the same answer; this is just the
smallest thing that isolates the escape step.

## Decisions We Made

| Decision | Category | Alternative |
|---|---|---|
| Prove a negative, isolate the load-bearing step | (c) | overclaim a working exploit |
| `STRICT` excludes the raw-text elements | (c) | permissive list (tested separately) |
| model both scripting flags | (a) | test only the sanitizer side |
| realistic `regexSanitizer` | (c) | trivial straw man |

## What We Proved

- The naive rawtext mXSS is **blocked** for all 8 raw-text/RCDATA elements
  against Chrome 148 — promoted text is escaped.
- The block rests entirely on `escapeText` running for text whose parent is not
  in the serializer's no-escape set.
- A realistic regex sanitizer is bypassed by `<img/onerror=alert(1)//src=x>` and
  by `<a href=&#106;avascript:…>`; the DOM sanitizer is bypassed by neither.
- A *kept* `<style>` survives with its text emitted **raw** — the hazard Module 5
  turns into a working exploit.
- 17/17 assertions pass.
