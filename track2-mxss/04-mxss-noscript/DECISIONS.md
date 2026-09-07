# DECISIONS — Module 4: The Scripting Flag (`<noscript>`)

**(a)** spec-forced · **(b)** contract-forced · **(c)** our convention.

## The flag is a single boolean parse option, checked in one place

**(a)** WHATWG §13.2: the scripting flag affects tree construction in exactly one
spot — the `<noscript>` branch. Our engine models it as one `if` in
`insertStart`. Anything more elaborate would misrepresent the spec.

## `domSanitizer` is hard-wired to `scripting: false`

**(c)** Because that is what a server-side sanitizer, a `DOMParser`, and a
`<template>`-based client sanitizer all actually get. Making it configurable
would let a reader "fix" the module by flipping a flag and miss that the flag is
usually *not* under the sanitizer author's control.

## The module reports a negative result for the classic vector, and says why

**(c)** Every `<noscript>` payload is blocked in Chrome 148 — by attribute
`< >` escaping (2020) or because the off-parse exposes the `<img onerror>` to the
sanitizer. We reproduce the *mechanism* (two trees, verified) and are explicit
that the *exploit* needs an old serializer, a string filter, or an
allow-`<noscript>` misconfiguration. Overclaiming a live bug here would be
dishonest and would date badly.

## `serverSanitizeThenBrowser` re-parses with `scripting: true`

**(a)** The sink is a live document. Modelling only the sanitizer side would
hide the mutation by construction.

## What We Proved

- `<noscript><img src=x onerror=alert(1)></noscript>` → `['noscript','img']`
  (scripting off) vs `['noscript']` (scripting on). Verified against Chrome 148.
- Off-parse has a live handler; on-parse does not.
- The classic attribute payload is neutralised by the modern serializer:
  `< >` in the `title` become `&lt; &gt;`, and RAWTEXT never decodes them.
- Residual risk is real for string sanitizers and for sanitizers that allow
  `<noscript>` — shown in `proof.html`.
- 6/6 assertions pass.
