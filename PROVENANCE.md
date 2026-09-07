# PROVENANCE.md

Every file in `bob_mXSS` is one of:

- **NEW** — written for this course.
- **COPIED** — taken verbatim from a sibling course in `RecentInnerDesktop/`, with a
  provenance note added to its footer. Its tests (if any) were re-run here on the copy date.
- **ADAPTED** — copied, then edited here (links repointed, a Sekondi Context callout added).
  Every edit is listed below.

The three sibling courses (`bob_browser_tokenization`, `bob_foster_parenting`,
`bob_CSP_trusted_types`) are **not modified**. All adaptation happens on copies inside this
folder.

---

## Copied / reused

| Path here | Source | Copied | Re-verified here |
|---|---|---|---|
| `engine/foster-parser/` | `bob_foster_parenting/track1-core/` (all 15 module dirs, `src/` + `test/` + `DECISIONS.md` + `tutorial.html`) | 2026-09-07 | `14_adoption_agency` capstone suite + `06_what_gets_fostered`, `11_templates_fragments`, `05_seven_substeps` demos — all pass |
| `assets/vendor/tokenizer.css` | `bob_browser_tokenization/assets/style.css` | 2026-09-07 | n/a (stylesheet) |
| `assets/vendor/foster.css` | `bob_foster_parenting/templates/course.css` | 2026-09-07 | n/a (stylesheet) |

### Why the whole `track1-core/` tree, not just the files Module 1 needs

`dispatch14.js` (the latest tree-construction engine) `require()`s `src/` files from ten of
the fifteen module directories by relative path (`../../06_what_gets_fostered/src/foreign.js`,
etc.). Copying the tree whole preserves every relative path so the engine runs unchanged.
Copying a subset would mean rewriting `require` paths — an edit to verified code, for no gain.

---

## Adapted (edits to copies listed line-by-line)

*None yet.* When the ~9 sibling tutorial pages named in `ROADMAP.md` are copied in and given a
Sekondi Context callout, each edit gets a row here: file, what was inserted, nothing else
touched.

---

## New (course-authored) — built 2026-09-07

- `index.html`, `ROADMAP.md`, `GLOSSARY.md`, `REFERENCES.md`, `PROVENANCE.md`
- `assets/style.css` (notebook theme from `foster-parenting-course.html`, per user request,
  + this course's `.sekondi` / `.payload` / `.verdict` / `.oracle` / `.provenance` components)
- `assets/vendor/tokenizer.css`, `assets/vendor/foster.css` (verbatim, for any future copied pages)
- `prerequisites/` — hub + `prereq_namespaces.html` + `prereq_scripting-flag.html`
- **`engine/mxss-lab/`** — the from-scratch engine: `lab.mjs` (tokenizer + tree builder with
  foreign content / RCDATA / RAWTEXT / scripting flag / `<template>` / entities + the §13.3
  serializer + `roundTrip`), `sanitizers.mjs` (regex / DOM-walk / hardened), `smoke.mjs`.
  Every behaviour cross-checked against Chrome 148.
- **11 modules**, each `src/*.mjs` + `test/demo.mjs` (all passing — 115 assertions total) +
  `tutorial.html` + `DECISIONS.md`:
  - `track1-engine/01-foreign-content-fragment/` (10 tests) + `concept_how_they_connect.html`
  - `track1-engine/02-serializer-roundtrip/` (9)
  - `track2-mxss/03-mxss-rcdata/` (17) + `concept_how_they_connect.html` + `proof.html`
  - `track2-mxss/04-mxss-noscript/` (6) + `proof.html`
  - `track2-mxss/05-mxss-namespace/` (9) + `proof.html`
  - `track2-mxss/06-mxss-attributes/` (10)
  - `track2-mxss/07-mxss-template/` (7) + `proof.html`
  - `track2-mxss/08-hardened-sanitizer/` (20)
  - `track3-frontier/09-parser-differentials/` (6)
  - `track3-frontier/10-reading-disclosures/` (5)
  - `track3-frontier/11-native-sanitizer-api/` (16) + `proof.html`
- `lessons/01_history-of-mxss/` — `01_explainer.html` + `02_deepdive_heiderich_era.html` +
  `03_deepdive_dompurify_bypass_chain.html`; `lessons/README.md`

## Verification environment

Chrome 148.0.7778.280 (Claude in-app browser), Node.js v22.14.0. Every "the alert fires" /
"the tree looks like this" / "this vector is patched" claim was produced by running code —
`DOMParser`, live `innerHTML`, real `Element.setHTML()`, and the module test suites — on
2026-09-07, not asserted from memory.
