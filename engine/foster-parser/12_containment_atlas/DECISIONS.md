# Module 12 — DECISIONS

Line-by-line rationale for `src/merge.js`, `src/dispatch12.js`, and `src/containment_atlas.js`. Categories
as before: **(a)** forced by spec, **(b)** forced by external contract, **(c)** our own convention.

---

## Why this module is mostly an audit, not new mechanism

Every module through 11 built one specific piece of tree-construction machinery. This module does that
only once (the MERGE tactic, below) — its main job is stepping back and classifying everything this course's
engine (and the real spec) does when content doesn't fit where it landed, against the seven-tactic taxonomy
the attached reference course's own Module 10 names: FOSTER, CLOSE, IGNORE, POP+REPROCESS, REDIRECT, MERGE,
ADOPTION AGENCY — plus two structural impossibilities, TOKENIZER and VOID.

## `src/merge.js`

**A second `<html>` start tag merges attributes onto `state.stack[0]` rather than creating a new element,
with first-occurrence-wins semantics for duplicate attribute names.**
**(a) forced by spec, verified against real output.** A live-browser test (`<html foo="1">...<html bar="2"
foo="override">`) confirmed exactly this: one `<html>` element in the final tree, `foo="1"` (the FIRST
value, not the second tag's `"override"`), and `bar="2"` (a genuinely new attribute, added). This is a real
spec behavior, not an assumption — see the captured output in "What We Proved" below.

**`mergeHtmlAttributes` assumes `state.stack[0]` is always the html root, rather than searching the tree for
an element with `tagName === 'html'`.**
**(c) our own convention**, and a safe one specifically because of a guarantee Module 01 already
established: `before html`'s handler ensures exactly one `html` element is ever created, and it's always
the first thing pushed onto the stack. Searching the tree would be more defensive but also strictly more
code for a guarantee this engine already has.

## `src/dispatch12.js`

**The MERGE check is placed at the very top of `inBodyFosterAware12`, before the `Character` and generic
`StartTag` branches.**
**(a) forced by spec.** A second `<html>` tag is exactly as unhandled by every mode's specific clauses as
any other "anything else" content — it reaches this shared function the same way a stray `<div>` would.
Checking `tagName === 'html'` first is simply the narrowest, most specific match, same ordering principle
Module 07's `inTableRefusesFostering` already established (specific cases before generic fallback).

## `src/containment_atlas.js`

**Rows are marked `implemented: false` with a specific, one-sentence `reason` rather than omitted entirely
when this engine doesn't build that tactic.**
**(c) our own convention**, consistent with every "honest gap" this course has logged since Module 04's
`colgroup`/`col` rows. An atlas that only showed what's built would look complete by omission; naming what
isn't, and why, is what makes the "7 of 14" count in this module's own test output meaningful rather than
cherry-picked.

**"in table" mode's anything-else clause borrowing "in body" rules (Module 03) is counted as an implemented
REDIRECT, while `<style>`/`<script>`/`<template>`'s real "processed with in head rules" (Module 07) is
counted as NOT a true REDIRECT.**
**(c) our own convention, a judgment call worth stating plainly.** Both look superficially similar
("hand this token to a different mode's rules"), but Module 03's version genuinely borrows another mode's
actual rule table via `MODES['in body']` — the real mechanism. Module 07's version, by its own DECISIONS.md,
uses plain ordinary insertion as a stand-in, never actually consulting a general "in head" rule table (this
engine doesn't have one). Counting both the same way would overstate what's built; the atlas draws the line
where the underlying code actually does or doesn't do the thing the tactic name describes.

**The general "reprocess the token" mechanism (used since Module 01) is listed as backing the
POP+REPROCESS tactic, even though no single module is titled "POP+REPROCESS."**
**(c) our own convention.** The tactic name describes a *pattern* — pop something, then re-run the same
token under new rules — and this course's engine has used that exact pattern repeatedly (implied-element
insertion in `before html`/`before head`, Module 08's buffered-run flush) without ever building a
dedicated "colgroup-style" POP+REPROCESS handler. The atlas credits the pattern where it's genuinely used,
rather than requiring an exact one-to-one module match.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| MERGE: first-occurrence-wins on duplicate attrs, new attrs added | (a) spec | Verified directly against real browser output |
| `mergeHtmlAttributes` trusts `stack[0]` is the html root | (c) convention | Guaranteed by Module 01's `before html` handler |
| MERGE checked first, before Character/generic StartTag | (a) spec | Most specific match first — same ordering as Module 07 |
| Atlas rows honestly marked not-implemented with named reasons | (c) convention | Makes the "7 of 14" claim meaningful, not cherry-picked |
| Module 03's mode-borrowing counted as REDIRECT; Module 07's simplified template handling is not | (c) convention, judgment call | One genuinely borrows another mode's rule table; the other is a documented stand-in |
| General "reprocess the token" pattern credited to POP+REPROCESS | (c) convention | Credits a real, repeatedly-used pattern rather than requiring an exact module match |

## What We Proved

Running `node test/demo.js` (real output, captured verbatim):

```
── The MERGE tactic: a second <html> tag merges attributes, creates no new node ──
<!DOCTYPE html><html foo="1"><head></head><body><html bar="2" foo="override"></body></html>

Number of <html> ELEMENT objects in the tree: 1
Root <html> attrs: foo="1" bar="2"

OK: exactly one <html> node; foo="1" (first wins), bar="2" (new attribute added).

── The containment atlas: every tactic this course names, and what's built ──
[... 14 rows ...]

7 of 14 atlas rows are backed by real, tested code in this engine;
the rest are honestly scoped out, each with a specific, named reason.

OK — all assertions passed. Module 12 containment atlas verified.
```

This proves, first, that the MERGE tactic — the one new mechanism this module builds — matches real browser
behavior exactly, including the easy-to-get-backwards detail that the FIRST attribute value wins on a
duplicate, not the second (a naive "last write wins" implementation would get this wrong immediately). Second,
it proves — by exhaustive, honest accounting rather than assertion — that this course's engine implements
real, tested code for 7 of the 14 containment behaviors worth naming: FOSTER (the whole course's subject),
the flow-content non-tactic for `td`/`th`, MERGE (this module), IGNORE, the explicit-clause-then-pop pattern,
mode-level REDIRECT, and the general reprocess-the-token pattern behind POP+REPROCESS — while CLOSE, the
adoption agency, true REDIRECT, TOKENIZER, and VOID remain out of scope, each for a stated, specific reason.
