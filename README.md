# mutagen

**Mutation XSS, Built From Scratch — an applied, from-first-principles course on the class of XSS where a sanitizer's clean output becomes dangerous again the moment a browser re-parses it.**

## Safety & scope

This is an **authorized, localhost-only security research lab**, built for defensive study, not for use against any system its operator doesn't own. There is no network-facing server anywhere in this repository: every module is a Node.js script (`test/demo.mjs`) you run on your own machine, or a static `tutorial.html` / `proof.html` page you open directly in your own browser. Verification happened against a local Chrome instance and a from-scratch Node.js engine — never against a third party.

- **Do not point any technique documented here at a system you do not own or do not have explicit written authorization to test.** Every mutation and every bypass reproduced in this course is demonstrated against local, synthetic markup — never a live target.
- The from-scratch parsing/serialization engine (`engine/mxss-lab/`) and the sanitizers it tests are teaching artifacts, not production security tools — do not use them to sanitize real user input.
- This material exists to make defenders precise about *why* a sanitizer fails, so that the fix that follows closes the actual mechanism instead of the symptom.

## What this is

Mutation XSS (mXSS) is the attack that survives sanitization: a payload that is genuinely inert in the tree a sanitizer inspects, but which the sanitizer's own serializer re-encodes into a string that a browser's *second* parse turns into a live, executing element. In one line:

```
parse(serialize(parse(x))) ≠ parse(x)
```

`mutagen` is an **applied continuation** of two completed sibling courses in this workspace — `bob_browser_tokenization` (the from-scratch HTML tokenizer) and `bob_foster_parenting` (the from-scratch tree-construction engine, including foster parenting and a first pass at mXSS) — plus `bob_CSP_trusted_types` for the defense layer beyond sanitizing. Rather than duplicate what those courses already built and verified, `mutagen` surveys them, reuses their engines directly, and builds only the **eleven modules that were genuinely missing**: the engine pieces nobody built (the fragment/foreign-content parser extension and the serializer round-trip), the full catalogue of mutation classes (RCDATA/rawtext unwrapping, the scripting flag, namespace confusion, attribute serialization, `<template>` reparenting, and a hardened sanitizer that closes all of them), and PhD-depth frontier work (a differential harness across seven DOM-injection sinks, a repeatable method for dissecting real disclosures, and a hard look at whether the platform's native Sanitizer API actually closes the gap).

Every module is attack-first: reproduce the mutation for real, in a real browser, before studying the fix.

## Module map

| # | Module | What it proves |
|---|--------|-----------------|
| — | Prerequisites | Namespaces (HTML/SVG/MathML, `createElementNS`) and the scripting flag — the two concepts nothing next door covers |
| — | Engine: foster-parser | Reused, re-verified tree-construction + foster-parenting engine from `bob_foster_parenting` (15 sub-modules, copied whole to preserve relative `require` paths) |
| 01 | Foreign Content & the Fragment Parser | The tree builder switches namespace at `<svg>`/`<math>`, switches back at integration points (`<foreignObject>`, `<mtext>`, `<mi>`, `<mglyph>`), and `</style>`/`<img>`/CDATA change meaning across those boundaries |
| 02 | The Serializer, and Why It Won't Round-Trip | The `innerHTML` **getter** algorithm (WHATWG §13.3) reconstructs a string by fixed rules that can emit markup the original never contained |
| — | Engine: mxss-lab | The from-scratch tokenizer + tree builder + §13.3 serializer + `roundTrip` this course is built on, cross-checked against Chrome 148 |
| 03 | mXSS via RCDATA / Rawtext Wrapper Removal | Deleting a disallowed `<title>`/`<textarea>`/`<style>`/`<xmp>`/`<noembed>`/`<noframes>` wrapper re-parses its former text as a live `onerror` element — full catalogue, each variant browser-verified |
| 04 | mXSS via the Scripting Flag (`<noscript>`) | A sanitizer running with scripting disabled passes a payload unchanged that a real (scripting-enabled) browser parses into an executing handler — the Google Search 2019 bug, reproduced |
| 05 | mXSS via Namespace Confusion (SVG/MathML) | Markup inert inside the SVG/MathML namespace becomes an HTML `<img onerror>` once the foreign wrapper is stripped or the namespace boundary is miscomputed — the DOMPurify bypass family (Kinugawa, Bentkowski) |
| 06 | mXSS via Attribute Serialization | Character references and quote characters in an attribute value, re-serialized by a lossy serializer, break out of the attribute on the next parse |
| 07 | mXSS via `<template>` Reparenting | Content moved into or out of a `<template>`'s inert `DocumentFragment` changes parsing context and re-animates an otherwise-inert payload |
| 08 | The Hardened Sanitizer | One sanitizer, built here, that closes every payload from Modules 3–7 — then reads DOMPurify's real source (`_forceRemove`, `SAFE_FOR_TEMPLATES`, namespace checks, `IS_ALLOWED_URI`) line by line against the module that motivates each guard |
| 09 | Parser Differentials — the Sink Zoo | The same string produces different trees through `innerHTML`, `Range.createContextualFragment`, `DOMParser.parseFromString`, `template.innerHTML`, `XMLSerializer`, `outerHTML`, and `document.write` — a differential harness across all seven |
| 10 | Reading Disclosures Like a Researcher | A repeatable dissection method — payload → parser rule → serializer rule → sanitizer assumption — applied to 5+ real DOMPurify/AMP4Email/`sanitize-html` writeups, each ending at the exact patch commit |
| 11 | The Native Sanitizer API — Does the Platform Fix Hold? | Why `Element.setHTML()`/`Document.parseHTML()` are mutation-safe by construction (sanitize-then-never-reserialize) — every Module 3–7 payload re-run through a `setHTML()` model and shown inert, then the residual surface (`allowElements` misconfig, `setHTMLUnsafe()`, declarative shadow DOM) |
| — | Lessons: history of mXSS | The timeline spanning Modules 3–11: Heiderich et al.'s CCS 2013 paper → the IE backtick/`mhtml:` era → the DOMPurify bypass chain (Kinugawa, Bentkowski, 2015–2024) → Google Search 2019 → AMP4Email Gmail XSS → the browser vendors' answer (the Sanitizer API, 2024–2026) |

## Tech stack

`mutagen` is **JavaScript-only, front-to-back** — there is no Python or PHP implementation in this course:

- **Node.js (`.mjs`)** — the from-scratch parsing/serialization engine (`engine/mxss-lab/lab.mjs`), sanitizer implementations (`sanitizers.mjs`), and every module's `src/*.mjs` + `test/demo.mjs` test suite.
- **Static HTML** — every module's `tutorial.html` (Head First-style walkthrough) and, for the modules that need a live oracle, a `proof.html` page that reproduces the mutation directly in a real browser DOM.
- **Reused engine code** — `engine/foster-parser/` is the `bob_foster_parenting` tree-construction engine, copied in whole (all 15 sub-modules) so its internal relative `require()` paths keep working unmodified.

## Running it

```bash
# Run a module's test suite (Node.js, no dependencies)
cd track2-mxss/05-mxss-namespace
node test/demo.mjs

# See a mutation happen live, in your own browser
# — just open the file, no server needed:
#   track2-mxss/05-mxss-namespace/proof.html
```

## Status

Complete as scoped: all 11 new modules are built, each with `src/*.mjs`, a passing `test/demo.mjs`, a `tutorial.html`, and a `DECISIONS.md` — **115 assertions total, all passing**. Every "the alert fires" / "the tree looks like this" / "this vector is patched" claim was produced by actually running code (`DOMParser`, live `innerHTML`, real `Element.setHTML()`) rather than asserted from memory, verified against Chrome 148.0.7778.280 and Node.js v22.14.0 on 2026-09-07. `PROVENANCE.md` tracks exactly which files are new, copied verbatim from the sibling courses, or adapted, so provenance stays auditable; the sibling courses themselves (`bob_browser_tokenization`, `bob_foster_parenting`, `bob_CSP_trusted_types`) were not modified.
