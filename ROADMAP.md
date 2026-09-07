# ROADMAP — Mutation XSS, Built From Scratch

> Course identity: **`bob_mXSS`** — the applied-security continuation that picks
> up where **`bob_browser_tokenization`** Module A3 explicitly stopped, and
> where **`bob_foster_parenting`** Track 2 covered only the table-shaped slice
> of mXSS.
>
> **Phase 0 APPROVED 2026-09-07.** Plan: copy + adapt the ~12 needed sibling
> modules into this folder (originals untouched), build the 11 new modules, add
> the Sekondi Context to every new module and to the ~9 copied sibling pages.
> Build status is tracked in the Status columns below and in `PROVENANCE.md`.
>
> **BUILT 2026-09-07 — all 11 modules complete.** Theme switched to the notebook
> / letterpress skin from `foster-parenting-course.html` (user request), used on
> every tutorial. From-scratch engine at `engine/mxss-lab/`. Every module has
> `src/` + a passing `test/demo.mjs` (115 assertions, 0 failures) + `tutorial.html`
> + `DECISIONS.md`; 5 `proof.html` pages verified in Chrome 148; 2 concept
> vocabulary webs; `lessons/01_history-of-mxss/` (explainer + 2 deep dives).
> See `PROVENANCE.md` for the full manifest.
>
> **Deviations from the plan, all deliberate:** (1) each module's vocabulary web
> is a single `concept_how_they_connect.html` hub (grid + chain diagram +
> confused-pairs + quiz) rather than one file per term — more scannable, same
> content. (2) Per-module deep dives were folded into the tutorials and
> `lessons/01` rather than shipped as separate `NN_deepdive_*.html` per module.
> (3) Several attack modules honestly report their classic vector as **patched**
> in Chrome 148 (attribute `<>` escaping, ~2020) and demonstrate the still-live
> variants instead — the mechanism is taught either way.

---

## The one-sentence version of the whole subject

A sanitizer parses a string into a DOM tree, cleans the tree, and serializes it
back to a string. The browser then **re-parses** that string at `innerHTML`.
Mutation XSS is when re-parsing the sanitizer's *own clean output* produces a
different, dangerous tree — because HTML parsing is **not idempotent**:
`parse(serialize(parse(x)))` ≠ `parse(x)`.

---

## What already exists next door — and what this course must NOT rebuild

You have three finished courses in `RecentInnerDesktop/` that this subject
overlaps. The rule you gave: **link them, don't rebuild them; only add what is
genuinely missing.** Here is the survey.

### `bob_browser_tokenization` — COMPLETE (19 modules, JS + Java, browser-verified)

| Covers (so we link, not build) | Where |
|---|---|
| The full HTML tokenizer, 68 spec states, state by state | `modules/01`–`16` |
| RCDATA / RAWTEXT / PLAINTEXT / script-data at the **tokenizer** level | `modules/05`–`08` |
| CDATA sections as a foreign-content escape hatch (tokenizer level) | `modules/15` |
| Character-reference decoding (`&amp;` / `&#38;` / `&#x26;`) | `modules/04`, `11` |
| A minimal insertion-mode tree builder | `modules/a1-tree-construction` |
| A **tokenizer-based sanitizer** vs. a naive regex sanitizer (divergence proven) | `modules/a2-sanitizer` |
| The **mXSS mechanism** — context-sensitive fragment parsing, `<textarea>` inert→live, live-browser-verified | `modules/a3-security` |

**A3 explicitly lists as OUT of its scope** (quoted from its own §05): "other
named real-world mXSS variants that depend on machinery this course deliberately
left out of scope (**foreign content**, the **scripting flag** affecting
`<noscript>`)", the **full fragment-parsing algorithm** with namespace
switching, and **fixing the mechanism**. That out-of-scope list is this
course's to-do list.

### `bob_foster_parenting` — COMPLETE (Track 1: 15 modules; Track 2: 5 mXSS modules)

| Covers (so we link, not build) | Where |
|---|---|
| Stack of open elements, insertion-mode dispatch, adjusted insertion location | `track1-core/01`, `05`, `12` |
| **Foster parenting** in full — the table-relocation engine | `track1-core/02`–`09`, `13` |
| Templates, fragments, detached tables, the `innerHTML`-vs-document inversion | `track1-core/11` |
| The adoption agency algorithm / misnested formatting repair | `track1-core/14` |
| "What mXSS actually is" — one concrete sanitize→serialize→reparse cycle | `track2-mxss/01` |
| Naive allowlist sanitizer defeated by fostering | `track2-mxss/02` |
| Whitespace-run & text-fusion vectors | `track2-mxss/03` |
| **Idempotent serialization** — the reparse-and-diff defense (DOMPurify-style loop) | `track2-mxss/04` |
| 2–3 disclosed real mXSS case studies reproduced | `track2-mxss/05` |
| Deep dives: insertion-mode statechart, scope & active formatting | `lessons/01`, `02` |

### `bob_CSP_trusted_types` — COMPLETE (24 modules)

| Covers (so we link, not build) | Where |
|---|---|
| CSP header parsing, directive enforcement, nonce/hash/`strict-dynamic` | `track1-csp-core/02`–`08` |
| `require-trusted-types-for`, policy factory, **default policy**, HTML/script sink guards | `track2-trusted-types/15`–`19` |
| Brand-check `instanceof`, forged-object defense, **sanitizer capstone** | `track2-trusted-types/22`–`24` |
| Deep dives: CSP+TT layering, TT and prototypes | `lessons/02`, `03` |

**⇒ My entire original "Module 19: Defense in Depth" is already built here.** We
link to it; we do not restate CSP or Trusted Types.

---

## What is genuinely MISSING — this course's real scope

After the survey, only **8 modules** are new. Everything else is a hyperlink.

### Prerequisites Layer (Phase 1)

Root `prerequisites.html` is mostly a **link hub** into the three sibling
courses' existing prerequisite pages and modules. Only **two new micro-pages**
are written here, because nothing next door covers them:

| New file | Why it doesn't exist yet |
|---|---|
| `prereq_namespaces.html` | HTML vs SVG vs MathML namespaces, `createElementNS`, why `<a>` means different things per namespace. Tokenization treats CDATA but never namespaces as a concept; foster parenting only routes foreign *elements* through fostering. |
| `prereq_scripting-flag.html` | The "scripting enabled" flag, and the fact that jsdom / server-side DOMPurify and a real browser set it to **opposite** values. Named nowhere in the three courses. |

Everything else links out: FSM / input streams / lookahead → `bob_browser_tokenization/prerequisites`; DOM node shape, tokens & nodes → `bob_foster_parenting/prerequisites`; content models → `bob_browser_tokenization/modules/05`; character references → `bob_browser_tokenization/modules/04`; idempotency & reparse-and-diff → `bob_foster_parenting/track2-mxss/04`; CSP / Trusted Types / sanitizer-as-last-line → `bob_CSP_trusted_types`.

### TRACK 1 — The Engine Pieces Nobody Built (2 modules)

| # | Module name | What it proves | Directory | Reuses / depends on | Status |
|---|---|---|---|---|---|
| 1 | Foreign Content & the Fragment Parser | Proves the tree builder switches namespace at `<svg>`/`<math>`, switches back at HTML/text **integration points** (`<foreignObject>`, `<mtext>`, `<mi>`, `<mglyph>`), and that `</style>`, `<img>` and CDATA all change meaning across those boundaries — the machinery `bob_browser_tokenization/A3` says it deliberately omitted. Built as a thin extension of the `bob_foster_parenting` tree engine, not a new parser. | `track1-engine/01-foreign-content-fragment/` | `bob_foster_parenting/track1-core/*` engine; `bob_browser_tokenization/modules/a1`, `a3` | ⬜ Planned |
| 2 | The Serializer, and Why It Won't Round-Trip | Proves `innerHTML`'s **getter** algorithm reconstructs a string using fixed rules that can emit markup the original never contained — attribute re-quoting, entity rules, the special-serialization elements (`<style>`, `<script>`, `<xmp>`, `<noembed>`, `<noframes>`, `<plaintext>`), and the spec's own note that the output is not guaranteed safe to re-parse. `bob_foster_parenting/T2-04` does reparse-and-**diff**; nobody builds the **serializer** and shows what *it* invents. | `track1-engine/02-serializer-roundtrip/` | `bob_foster_parenting/track2-mxss/04` (idempotency loop) | ⬜ Planned |

### TRACK 2 — The Mutation Classes: the catalogue nobody built (6 modules)

| # | Module name | What it proves | Directory | Reuses / depends on | Status |
|---|---|---|---|---|---|
| 3 | mXSS via RCDATA / Rawtext Wrapper Removal | `bob_browser_tokenization/A3` proved the mechanism once, with `<textarea>`. This proves the **full catalogue**: when a sanitizer deletes a disallowed `<title>` / `<textarea>` / `<style>` / `<xmp>` / `<noembed>` / `<noframes>` wrapper, its former **text** content is re-parsed as a live `onerror` element — each variant demonstrated, each verified in a real browser (`proof.html`). | `track2-mxss/03-mxss-rcdata/` | T1-M2; `bob_browser_tokenization/modules/05`, `a3` | ⬜ Planned |
| 4 | mXSS via the Scripting Flag (`<noscript>`) | Proves a sanitizer running with scripting **disabled** passes `<noscript><p title="</noscript><img src=x onerror=alert(1)>">` unchanged, and a real browser with scripting **enabled** parses it into an executing handler — the **Google Search 2019** bug, reproduced and browser-verified. Explicitly on `A3`'s out-of-scope list. | `track2-mxss/04-mxss-noscript/` | `prereq_scripting-flag`; T1-M1 | ⬜ Planned |
| 5 | mXSS via Namespace Confusion (SVG / MathML) | The famous one, and it is missing everywhere. Proves markup that is inert inside the SVG/MathML namespace becomes an HTML `<img onerror>` once the foreign wrapper is stripped or the namespace boundary is miscomputed: `<svg><style>`, `<math><mtext><table>`, `<mglyph>` / `<malignmark>` text-integration-point confusion, `<form>` double-nesting, `<svg></p>` breakout, CDATA-in-foreign. The **DOMPurify bypass family** (Kinugawa, Bentkowski), each reproduced. | `track2-mxss/05-mxss-namespace/` | T1-M1 (integration points); `bob_foster_parenting/track1-core/06` | ⬜ Planned |
| 6 | mXSS via Attribute Serialization | Proves character references and quote characters in an attribute value, re-serialized by a lossy or non-re-encoding serializer, break **out** of the attribute on the next parse: `title="&lt;/style&gt;&lt;img src=x onerror=1&gt;"`, quote-in-value, and the historical IE backtick vector documented as **history**, not run. | `track2-mxss/06-mxss-attributes/` | T1-M2 (serializer); `bob_browser_tokenization/modules/11` | ⬜ Planned |
| 7 | mXSS via `<template>` Reparenting | Proves content moved into or out of a `<template>`'s inert `DocumentFragment` changes parsing context and re-animates a payload inert in its original position — the concrete attack on top of the tree mechanics `bob_foster_parenting/track1-core/11` already built. | `track2-mxss/07-mxss-template/` | `bob_foster_parenting/track1-core/11` | ⬜ Planned |
| 8 | The Hardened Sanitizer (and how DOMPurify actually does it) | Proves **one** sanitizer, built here, that closes every payload from Modules 3–7: sanitize-the-serialized-output-in-a-loop (borrowed from `bob_foster_parenting/T2-04`), enforce namespace on every element, unwrap `<template>`, forbid the known mutating elements. Then reads the **real DOMPurify source** side by side — `_forceRemove`, `SAFE_FOR_TEMPLATES`, the namespace checks, `IS_ALLOWED_URI` — and maps each line to the module that motivates it. Hands off to `bob_CSP_trusted_types` for the layer beyond sanitizing. | `track2-mxss/08-hardened-sanitizer/` | all of Track 2; `bob_foster_parenting/track2-mxss/04`; hands to `bob_CSP_trusted_types` | ⬜ Planned |

### TRACK 3 — Frontier / PhD Depth (3 modules)

Track 2 makes you *able to reproduce* every known mXSS class. Track 3 is what a
PhD-level command of the topic additionally requires: the general theory the
classes are instances of, a repeatable method for dissecting a new disclosure,
and a hard look at whether the platform's own fix actually holds.

| # | Module name | What it proves | Directory | Reuses / depends on | Status |
|---|---|---|---|---|---|
| 9 | Parser Differentials — the Sink Zoo | Proves the mXSS round-trip is one member of a larger family: the *same string* produces different trees through `el.innerHTML` vs `Range.createContextualFragment` vs `DOMParser.parseFromString` vs `template.innerHTML` vs `new XMLSerializer().serializeToString` vs `el.outerHTML` vs `document.write`. Builds a differential harness across all seven sinks and maps which mutation classes each sink does and does not expose. | `track3-frontier/09-parser-differentials/` | T1-M1, T1-M2; `bob_browser_tokenization/modules/a3` | ⬜ Planned |
| 10 | Reading Disclosures Like a Researcher | Proves a repeatable dissection method — payload → which parser rule → which serializer rule → which sanitizer assumption — applied to 5+ real writeups reproduced locally: DOMPurify `2.0.0`, `2.0.17`, `2.2.2`, `2.4.x`, `3.x` bypasses (Bentkowski, Kinugawa, Kevin Mizu, SonarSource), the AMP4Email GMail XSS, and one non-DOMPurify case (`sanitize-html` / Ruby `Loofah`). Each ends with the exact patch commit and what invariant it restored. | `track3-frontier/10-reading-disclosures/` | Modules 3–8; `lessons/01_history-of-mxss` | ⬜ Planned |
| 11 | The Native Sanitizer API — Does the Platform Fix Hold? | Proves *why* `Element.setHTML()` / `Document.parseHTML()` are mutation-safe **by construction** — they sanitize the parsed tree and never re-serialize, so there is no round-trip to exploit — by re-running every Module 3–7 payload through a `setHTML()` model and showing each is inert. Then probes the residual surface: config-driven `allowElements` mistakes, `setHTMLUnsafe()`, and declarative-shadow-DOM interactions. Ends the course by locating sanitization correctly in the defense stack, handing to `bob_CSP_trusted_types`. | `track3-frontier/11-native-sanitizer-api/` | Module 8; `bob_CSP_trusted_types/track2-trusted-types` | ⬜ Planned |

### Every module also ships deep dives (PhD depth)

Beyond the Head First `tutorial.html`, each module folder carries numbered
`NN_deepdive_<facet>.html` files — one per facet the module's code motivates but
can't fully hold: the exact spec paragraphs (WHATWG §13.2 tree construction,
§13.3 serialization) with commentary, the alternative real-world implementations,
the performance cost of the reparse-and-diff loop, and the failure history. These
are counted as part of their module, not as extra modules.

### Phase 3 — Cross-Module Concept Cluster (1 new folder)

| Folder | Spans | Why central, why new |
|---|---|---|
| `lessons/01_history-of-mxss/` | Modules 3–11 | A single timeline nobody owns: Heiderich, Schäfer, Späth, Holz **"mXSS Attacks: Attacking well-secured Web-Applications by using innerHTML Mutations"** (CCS 2013) → the IE backtick / `mhtml:` era → the **DOMPurify bypass chain** (Masato Kinugawa, Michał Bentkowski 2015–2024) → **Google Search 2019** `<noscript>` → **AMP4Email GMail XSS** → the browser vendors' answer (the **Sanitizer API** / `setHTML()`, 2024–2026). Deep dives: one per bypass generation, plus "alternative real-world implementations" (DOMPurify vs. sanitize-html vs. Ammonia/`ammonia` vs. Ruby `Loofah` vs. the native Sanitizer API). Lives centrally because each attack module only needs its own slice of this. |

All citations collected in a root **`REFERENCES.md`** (papers, CVEs, blog posts,
DOMPurify patch commits, WHATWG spec anchors) — the course's bibliography, kept
append-only alongside `GLOSSARY.md`.

Other clusters already exist next door and are **linked, not rebuilt**:
`bob_foster_parenting/lessons/01_insertion_mode_statechart`,
`.../lessons/02_scope_and_active_formatting`,
`bob_CSP_trusted_types/lessons/02_csp_trusted_types_layering`.

### Phase 4 — Vocabulary Webs (2 new sets, each inside the module that introduces the cluster)

| Location | Confused terms — one `concept_<term>.html` each + a `concept_how_they_connect.html` hub |
|---|---|
| `track2-mxss/03-mxss-rcdata/` | **mutation XSS** vs **DOM XSS** vs **reflected XSS** vs **stored XSS** vs **self-XSS** vs **DOM clobbering** — the family tree "XSS" that mXSS sits inside; learners routinely call any of these "just XSS." |
| `track1-engine/01-foreign-content-fragment/` | **namespace** vs **integration point** vs **foreign content** vs **adjusted current node** vs **fragment parsing context** vs **the SVG DOM** — all merged into "the SVG stuff." |

The rawtext-family vocabulary web (**rawtext** vs **RCDATA** vs **escapable raw text** vs **PLAINTEXT** vs **CDATA**) already exists implicitly across `bob_browser_tokenization/modules/05` and `15`; Module 3 links there instead of duplicating it.

---

## Module count

- **New modules: 11** — Track 1: 2 (engine gaps), Track 2: 6 (the mutation catalogue), Track 3: 3 (frontier / PhD depth).
- Plus: 2 new prerequisite micro-pages, per-module deep dives, 1 new concept cluster, 2 new vocabulary webs, `REFERENCES.md`.
- Everything else in the subject = hyperlinks into the three sibling courses, surfaced *inside* this folder (see "Unified Folder Structure" below) so the seams don't show.

The first draft had 19 flat modules; ~11 of those were already built next door,
so this is 8 genuinely-missing core modules + 3 added for PhD-level depth.

---

## Recommended Stopping Points

| Your goal | Stop after |
|---|---|
| "I just want the mechanism and the history." | **Module 5** + `lessons/01_history-of-mxss/`. |
| "I need to understand the one famous bypass family (DOMPurify / SVG)." | **Module 5**. |
| "I have to configure or audit a sanitizer at work." | **Module 8**. |
| "I want the whole picture including production defenses." | Module 11, then walk `bob_CSP_trusted_types` Track 2. |
| "I only care about the parser internals." | **Module 2**, then `bob_browser_tokenization` end to end. |
| "I want PhD-level command — reproduce any disclosure, defend any design choice." | **Module 11 + all deep dives + `lessons/01`**. The whole thing. |

---

## Unified Folder Structure — the seams don't show

You said: *"build the folder structure so that I don't even realize that the
others may be outside the folder"* and *"copy modules from the other directories
that we need so that it looks as though we had this built anew."* So: **copy +
adapt**, not junctions. The ~12 needed sibling modules are copied into this
folder; each copied page carries a one-line provenance note; every copied test
suite is re-run here on arrival. The three sibling courses are never modified.
`PROVENANCE.md` is the ledger. Layout:

```
bob_mXSS/
├── index.html                  ← MASTER COURSE MAP. One linear numbered path (Prereq → M1 … M11
│                                 → lessons). Every step is a link; the learner just clicks "next"
│                                 and never needs to know which course a page physically lives in.
├── ROADMAP.md   GLOSSARY.md   REFERENCES.md
├── assets/style.css            ← the tokenizer course's skin, copied in
├── prerequisites/
│   ├── prerequisites.html      ← link hub
│   ├── prereq_namespaces.html            (NEW)
│   └── prereq_scripting-flag.html        (NEW)
├── track1-engine/
│   ├── 01-foreign-content-fragment/   (tutorial.html · DECISIONS.md · src/ · test/ · proof.html
│   │                                   · concept_*.html vocab web · NN_deepdive_*.html)
│   └── 02-serializer-roundtrip/
├── track2-mxss/
│   ├── 03-mxss-rcdata/  04-mxss-noscript/  05-mxss-namespace/
│   ├── 06-mxss-attributes/  07-mxss-template/  08-hardened-sanitizer/
├── track3-frontier/
│   ├── 09-parser-differentials/  10-reading-disclosures/  11-native-sanitizer-api/
├── lessons/
│   ├── README.md
│   └── 01_history-of-mxss/     (01_explainer.html + 6 NN_deepdive_*.html)
│
├── engine/
│   └── foster-parser/          ← COPIED from bob_foster_parenting/track1-core/ (whole tree,
│                                 so the engine's relative require() paths resolve unchanged).
│                                 Test suites re-run here on copy — see PROVENANCE.md.
├── _bridge/                    ← short interstitial pages for the handful of deep links that
│                                 still point at a sibling course (spec-level detail we don't
│                                 re-teach): "here's why you're going there, here's the Sekondi
│                                 anchor, here's what to come back for."
└── (copied sibling tutorial pages live beside the module that uses them, each with a
    provenance footer + a Sekondi Context callout — listed in PROVENANCE.md as ADAPTED)
```

Trade-off accepted: `bob_mXSS` becomes the single source of truth for this
learning path. If a bug is later fixed in a sibling course, the fixed file must
be re-copied here. The sibling courses are marked Complete, so this is low-risk —
and in exchange the folder is fully portable (zip it, move it, it still runs) and
reads as one course with no foreign skins mid-flow.

---

## Tools / Architecture Target

- **Platform:** Windows 11, PowerShell. Every "Run It" gives PowerShell commands.
- **Runtime:** Node.js 20 LTS, plain JavaScript (ESM), **no build step**. `node script.mjs`, and "open `proof.html` in a browser," are the only ways anything runs.
  - *(JS only — not the JS+Java parity of `bob_browser_tokenization`. This course is about browser behavior; a second language buys nothing here. Stated so the difference from the parent course is deliberate, not an oversight.)*
- **What is built from scratch:** the foreign-content extension to the reused tree engine (M1), the `innerHTML` serializer (M2), the five attack demos + `proof.html` pages (M3–M7), the hardened sanitizer (M8), the seven-sink differential harness (M9), the disclosure-reproduction rigs (M10), the `setHTML()` model (M11).
- **Reused as a dependency (copied whole into `engine/foster-parser/`):** the `bob_foster_parenting` Track 1 tree engine. Module 1's DECISIONS.md records exactly which files it imports and what it adds.
- **Reference oracles (to *check* against, never copied):** **a real browser** via the in-app browser for every "the alert fires" / "the tree looks like this" claim — `DOMParser`, live `innerHTML`, and screenshots are the evidence (Chrome 148 as of first build); **DOMPurify's published source** in Modules 8 and 10 only, as the reference for the real fix and to confirm each payload matches a published bypass/patch. No `parse5` — the browser is the oracle, matching the sibling courses' approach and keeping the dependency count at zero.
- **Design system:** one skin for the whole course — the `bob_browser_tokenization` look (Playfair Display headers, JetBrains Mono code, `assets/style.css`, `.page` layout, one `--accent` per module, Head First sections 00–09), plus this course's own components (the `.sekondi` callout, `.payload` / `.verdict` / `.provenance` boxes). Copied sibling pages keep their original CSS, vendored into `assets/vendor/` — the slight visual shift on those pages is deliberate and tells you it's imported material.
- **Verification discipline (non-negotiable):** no doc states a tree shape, a serialized string, or "the alert fires" without that exact result produced by a real run — mini-engine dumps, parse5 comparison dumps, browser screenshots/console.
- **Explicitly out of scope:** re-teaching the tokenizer, foster parenting, CSP, or Trusted Types (all linked); the full HTML5 tree-construction algorithm (M1 extends the reused engine only as far as the foreign-content attacks need, and cites parse5 for the rest); server-side / reflected / stored XSS as injection problems; DOM clobbering and prototype pollution (named in the vocab web, not built); mXSS in non-browser parsers (PDF, email, Markdown) — mentioned as "same idea elsewhere"; live exploitation of legacy-only vectors (IE backticks, `mhtml:`) — history only.

---

## The Sekondi Context — decided

**What it is:** every module has a "01 — The Big Analogy" section. The Sekondi
Context is a short, consistent callout that grounds that analogy in **one named
learner's world** — a boy in Sekondi, on Ghana's coast: the harbour and fishing
boats at Sekondi–Takoradi, the market stalls, the trotro, the fufu pounding, the
customs shed at the port. One recurring cast, so nothing floats free of a
concrete life. Additive — a callout box, never a rewrite. It coexists with the
PhD-level depth: the callout builds the intuition, the deep dives and DECISIONS
files carry the rigour.

**Scope (per your "do what is recommended"):**
- **`bob_mXSS`** — every new module, built in from the start.
- **Sibling courses** — the Sekondi Context callout is added **only to the ~9
  specific pages this course links to** as prerequisites/dependencies:
  `_reused/tokenizer-course/modules/05`, `a1`, `a3`;
  `_reused/foster-parenting-course/track1-core/06`, `.../track1-core/11`,
  `.../track2-mxss/01`, `.../track2-mxss/04`;
  `_reused/defense-course/track2-trusted-types/24` and `.../lessons/02`.
  Each edit is a single inserted callout `<div>`, non-destructive, logged in this
  course's `DECISIONS.md` under "edits to sibling courses." The other ~45 sibling
  modules are left untouched.
- Where a learner is sent to a sibling page **not** in that list, the `_bridge/`
  interstitial carries the Sekondi anchor instead, so the edit stays out of the
  finished course entirely.

---

## What I need from you to proceed past Phase 0

1. **Approve the reuse map** — anything marked "link, don't build" you want
   rebuilt here instead?
2. **Approve the 11-module list** (8 core + 3 frontier) and the Track 1/2/3 split.
3. **Approve the `_reused/` junction approach** for the seamless folder — or say
   you'd rather have plain `../bob_*` relative links (seams visible, but nothing
   machine-local to re-link).
4. Then I build, and stop for review after each: **(a)** the folder skeleton +
   `index.html` course map + junctions, **(b)** the Prerequisites layer, **(c)**
   Module 1 — one at a time, per the Phase-2 rule.
