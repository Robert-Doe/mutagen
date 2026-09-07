# DECISIONS — Module 7: `<template>` Reparenting

**(a)** spec/platform-forced · **(b)** contract-forced · **(c)** our convention.

## `forgetfulSanitize` reads `node.children`, not `node.content.children`

**(a)** WHATWG §4.12.3: a `<template>`'s child nodes go into its *template
contents* `DocumentFragment`, reachable only via `.content`. `template.children`
is genuinely empty. A recursive walk over `.children` therefore visits *zero*
nodes inside any template — a faithful model of a real, common sanitizer bug.

## `thoroughSanitize` does two things: read `.content`, and *unwrap* `<template>`

**(c) + (a)** Reading `.content` is forced (it's where the nodes are). Unwrapping
— hoisting the cleaned content and dropping the `<template>` tag — is our
convention, chosen because a *kept* template re-introduces the separate-fragment
gap on every later hop (re-sanitisation, re-serialisation, DSD). DOMPurify makes
the same call: `<template>` is removed unless explicitly added to `ALLOWED_TAGS`.

## The scenario models `t.innerHTML` extraction, not `t.content` move

**(c)** `sanitizeThenExtractTemplate` serialises the template's fragment and
re-parses it — equivalent to `target.innerHTML = t.innerHTML`, the most common
extraction pattern. `target.append(t.content.cloneNode(true))` reaches the same
end state (live nodes in the document) by a different path; modelling one is
enough to prove the class.

## Nested templates are tested explicitly

**(a)** Template contents can themselves contain templates, each its own
fragment. A `.children` walk misses all of them; the test confirms the thorough
walk's recursion into `.content` handles arbitrary depth.

## What We Proved

- `<template><img onerror></template>` puts the `<img>` in `.content`;
  `template.children.length === 0`.
- The forgetful sanitizer emits the payload with `onerror` **intact**.
- Extracting the template makes it **live** — including for nested templates.
- The thorough sanitizer scrubs the handler *and* unwraps the template, leaving
  nothing special to extract.
- 7/7 assertions pass.
