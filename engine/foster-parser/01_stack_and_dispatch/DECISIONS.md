# Module 01 — DECISIONS

Line-by-line rationale for `src/tokenizer.js`, `src/dispatch.js`, `src/parse.js`. Categories as in Module
00's DECISIONS.md: **(a)** forced by spec, **(b)** forced by external contract, **(c)** our own convention.

---

## A bug this module's own test caught

Before writing any of what follows, `test/demo.js` failed its first real run. The `initial` insertion
mode was written to unconditionally switch to `before html` and **reprocess** every token — including the
`DOCTYPE` token itself. Reprocessing the DOCTYPE token cascaded it through `before html` → `before head` →
`in head`, each mode inserting an *implied* element it didn't need to (an extra implied `<html>`, an extra
implied `<head>`), until `in head` received a `DOCTYPE` token it had no rule for and threw. The real bug
was invisible from reading the code — it only surfaced by actually running the parser and asserting on its
output, per this course's rule against writing docs from assumed behavior. Fixed by special-casing
`DOCTYPE` in `initial` to be fully consumed (mode switch only, no reprocess) — see the `initial` entry
below. This is **(a) forced by spec**: §13.2.4.2's `initial` insertion-mode rules process a DOCTYPE token
completely in place; every *other* token type there falls to "anything else," which switches modes and
*does* reprocess. Our first version treated all tokens the same way; the spec doesn't.

## `src/tokenizer.js`

**Regex/index-scanning tokenizer instead of the spec's character-by-character state machine.**
**(c) our own convention**, explicitly scoped in `ROADMAP.md`. The real tokenizer is an ~80-state machine
handling entities, RAWTEXT/RCDATA, malformed markup recovery, and more. This course's engine only needs to
correctly tokenize the well-formed subset of HTML its own test cases use — a much smaller, auditable
scanner gets there without importing (or reimplementing) that complexity. If a later module needs
RAWTEXT/RCDATA (e.g. `<script>`/`<style>`/`<title>` handling), it will extend this file there, not here.

**Duplicate attributes: first occurrence wins, later ones silently dropped.**
**(a) forced by spec.** The tokenizer's attribute-parsing algorithm is explicit: if an attribute's name is
already in the token's attribute list, the new attribute is ignored. `parseStartTag`'s
`if (!attrs.some(([k]) => k === name))` guard implements exactly this.

**A bare, unrecognized `<` (not a tag, comment, or doctype) is emitted as a literal `<` character token.**
**(c) our own convention**, and a deliberate simplification of real behavior. The real tokenizer's
"tag open state" has detailed rules for exactly which malformed constructs become literal `<` text versus
parse errors of other kinds. We collapse all of that to one fallback because no Track 1 test case depends
on the distinction — see `ROADMAP.md`'s explicit scope note on "no malformed-markup error recovery."

**`findTagEnd()` tracks quote state so a `>` inside a quoted attribute value doesn't end the tag early.**
**(b) forced by external contract.** This isn't a simplification we could safely skip — real HTML in the
wild (and later Track 2 sanitizer-input test cases) routinely contains attribute values with `>` in them
(e.g. `title=">"`). Getting this wrong wouldn't just be incomplete, it would be *incorrect* even for the
narrow subset we claim to support.

## `src/dispatch.js`

**`initial` mode fully consumes a `DOCTYPE` token (no reprocess); every other token switches mode and
reprocesses.**
**(a) forced by spec** — see "A bug this module's own test caught" above.

**`insertHtmlElement()` does not push onto an active-formatting-elements list, and does not compute an
adjusted insertion location — it always inserts after the current node's last child.**
**(c) our own convention**, deliberately deferred. The active-formatting list doesn't exist as a concept
until Track 1 Module 10; the adjusted-insertion-location algorithm (which can insert somewhere *other*
than "after the last child") is Module 05's entire subject. Building either now would be exactly the kind
of speculative future-proofing this course's engineering conventions warn against — Module 01 only needs
"append to current node," so that's all it does.

**`in head` accepts whitespace-only `Character` tokens and inserts them; any other character token (or any
other unhandled token) throws `NotImplementedYet`.**
**(a) forced by spec, narrowed by (c) convention.** The real `in head` mode does special-case ASCII
whitespace character tokens (insert them normally) — that part is spec-accurate. Non-whitespace character
tokens in the real spec fall to an "anything else" clause that pops `head`, switches to `after head`, and
reprocesses. We don't implement that fallback yet, because no Module 01 test case produces non-whitespace
text inside `<head>` — throwing a clear, typed error is safer than silently mishandling a case we haven't
verified.

**`NotImplementedYet` is a distinct `Error` subclass with a message naming the exact mode and token that
triggered it, rather than a generic `throw new Error(...)` or a silent no-op.**
**(c) our own convention**, chosen for the same reason as Module 00's `characterToken()` guard: failing
loudly and specifically, right at the engine's current capability boundary, is safer than either crashing
opaquely or (worse) doing nothing and letting a caller believe parsing succeeded when it didn't.

**`parse.js` is a two-line composition of `tokenize()` and the dispatch loop, kept in its own file
separate from `dispatch.js`.**
**(c) our own convention.** `dispatch.js` exports the lower-level pieces (`createParserState`, `dispatch`,
`currentNode`) that this module's own demo needs direct access to (to stop mid-parse deliberately);
`parse.js` is the ordinary "just run it" entry point later modules and Track 2 will import instead, once
they don't need to inspect a deliberately-interrupted mid-parse state.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| `DOCTYPE` fully consumed by `initial`, not reprocessed | (a) spec | Caught by this module's own failing test — see narrative above |
| Regex/index tokenizer, not a full state machine | (c) convention | Scoped to this course's well-formed test-case subset |
| First-occurrence-wins on duplicate attributes | (a) spec | Tokenizer's attribute algorithm is explicit about this |
| Unrecognized `<` becomes a literal character | (c) convention | No test case needs finer-grained malformed-markup handling |
| Quote-aware tag-end scanning | (b) external contract | Real/future test inputs contain `>` inside quoted attribute values |
| No active-formatting list, no adjusted insertion location yet | (c) convention | Deferred to Modules 10 and 05, which actually need them |
| Whitespace-only text allowed in `in head`, else `NotImplementedYet` | (a)+(c) | Spec-accurate for the case we implement; explicit boundary elsewhere |
| Typed `NotImplementedYet` error, not silent or generic | (c) convention | Makes the engine's current capability boundary visible and testable |

## What We Proved

Running `node test/demo.js` against `<!DOCTYPE html><html><head></head><body>hi<table></table></body></html>`
(real output, captured verbatim after the DOCTYPE bug above was found and fixed):

```
── Tokenized "<!DOCTYPE html><html><head></head><body>hi<table></table></body></html>" into 12 tokens ──

── Parser state the moment "in table" was first reached ──
mode: in table
current node: table
stack (bottom → top): html > body > table

── Document tree built so far ──
#document
└─ html
   ├─ head
   └─ body
      ├─ #text "hi"
      └─ table

── Stopped as expected on token #8 (EndTag table) ──
Insertion mode "in table" has no rules yet in this engine (token: EndTag table). This engine currently implements modes through Module 01 (initial…in body, switching into "in table"). Reaching this error means the dispatch loop correctly reached the mode — its own rules are built starting in a later module.

OK — all assertions passed. Module 01 dispatch loop verified.
```

This proves:

1. A real HTML *string* — not a hand-authored token array — can be tokenized by `tokenizer.js` and driven
   through `dispatch.js`'s insertion-mode loop automatically, for the first time in this course.
2. The dispatch loop correctly walks `initial → before html → before head → in head → after head → in body`
   and, on the `<table>` start tag, switches to `in table` with the exact stack the spec predicts:
   `html > body > table`, current node `table`.
3. The loop stops exactly where it should — on the *next* token after entering `in table` — rather than
   either silently mishandling it or crashing with an unrelated error.
4. Text ("hi") inserted in `in body` correctly fuses into one `TextNode`, reusing Module 00's
   `tryFuseCharacter` unchanged.

Module 02 begins filling in `in table`'s actual rules — starting with the two-condition gate that decides
whether foster parenting fires at all.
