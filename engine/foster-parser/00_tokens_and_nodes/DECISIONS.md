# Module 00 — DECISIONS

Line-by-line rationale for `src/tokens.js` and `src/nodes.js`. Every non-obvious choice is tagged:

- **(a) forced by spec** — the WHATWG HTML Standard leaves no alternative.
- **(b) forced by external contract** — some other API/format/consumer requires this shape.
- **(c) our own convention** — chosen for safety/clarity; a different consistent choice existed.

---

## `src/tokens.js`

**Six token types, no more, no fewer** (`DOCTYPE`, `StartTag`, `EndTag`, `Comment`, `Character`, `EOF`).
**(a) forced by spec.** §13.2.5 of the HTML Standard defines the tokenizer's emitted output as exactly
these shapes (EOF is the end-of-file signal, not a literal token in spec prose, but every insertion-mode
rule table has an explicit "An end-of-file token" row, so we model it as a first-class token type rather
than a special sentinel — see the "own convention" note below).

**`characterToken()` throws on any input whose length isn't exactly 1.**
**(c) our own convention.** The spec doesn't forbid a *data structure* from holding a multi-character
string — it's the tokenizer's *behavior* that never produces one. We could have allowed multi-char strings
and simply promised never to construct one that way. We chose to make it a hard runtime error instead,
because Module 08 ("in table text") is entirely about behavior that only exists *because* character tokens
arrive one at a time and must be explicitly buffered by tree construction. Silently allowing a batched
string here would let a later module accidentally sidestep the exact thing it's supposed to demonstrate.
Verified: `node -e "require('./src/tokens.js').characterToken('hi')"` throws
`RangeError: characterToken() takes exactly one character, got "hi" (length 2)...`.

**`EOF` modeled as a token type, not a special out-of-band signal.**
**(c) our own convention.** The spec's prose treats "an end-of-file token" as a token in every insertion
mode's rule table, so treating it as a real member of the token union (rather than, say, `null` or a thrown
sentinel exception) keeps every later module's dispatch code uniform: "what type is this token" always has
one answer, never a special case for the stream's end.

**End tag tokens carry no `attrs` field, even though real tokenizers parse (and then discard) attributes
on end tags.**
**(c) our own convention**, motivated by an **(a) spec fact**: the spec parses end-tag attributes only to
immediately flag them as a parse error and drop them before tree construction ever runs — no insertion-mode
rule ever inspects them. Giving `endTagToken()` an attrs field would let calling code construct a token
tree-construction can never actually receive from a real tokenizer, which would make our engine's behavior
unverifiable against real browsers for that shape. Omitting the field entirely keeps the type honest.

**`attrs` represented as a `Map`, not a plain object.**
**(c) our own convention.** A plain object would work, but attribute names are attacker-influenced strings
in some future Track 2 module's inputs, and `{}` has prototype-chain footguns (`"__proto__"` as an
attribute name colliding with `Object.prototype`). `Map` has no such collision surface and matches the
spec's own framing of an attribute list as an *ordered map*. This is exactly the kind of convention Track 2
(mXSS) will later show matters in production sanitizers, not just in our teaching engine.

**Tokens are plain object literals from factory functions, not classes.**
**(c) our own convention**, contrasted deliberately with `nodes.js` below. Tokens are consumed once by
tree construction and then discarded — they never need referential identity checks (`===`) and are never
mutated after construction. A class would add a constructor and a prototype chain for no behavioral
benefit; a plain object keeps `tokenToString()` and any future module's pattern-matching on `token.type`
trivial.

## `src/nodes.js`

**Four node kinds** (`DocumentNode`, `ElementNode`, `TextNode`, `CommentNode`), deliberately narrower than
the full DOM node type list (which also has `DocumentType`, `ProcessingInstruction`, `CDATASection`,
`DocumentFragment`, and more).
**(c) our own convention**, scoping the engine to exactly what this course's modules manipulate. Every
Track 1 module's test cases are built from element/text/comment content inside a document — no module in
the roadmap ever needs a `ProcessingInstruction`. If a later module needs `DocumentFragment` (Module 11,
for template contents), it will be added there rather than speculatively here — see the project-wide rule
against building for hypothetical future requirements.

**Nodes are ES classes with a mutable `parent` pointer, not plain objects.**
**(c) our own convention**, contrasted deliberately with `tokens.js` above. Unlike tokens, nodes have a
lifecycle: the same `ElementNode` instance can be pushed onto the stack of open elements (Prerequisite P3),
popped, and — per the spec's own explicit warning quoted in Prerequisite P3 — still be mutated afterward
via a stale reference. That requires stable object identity across a sequence of operations, which is
exactly what a class instance (vs. a value-like plain object) is for.

**`insertNode()` and `tryFuseCharacter()` centralize all splicing into one place in `nodes.js`, rather than
letting each future module reimplement child-list mutation.**
**(c) our own convention.** Nothing forces this — every module *could* splice into `.children` directly.
Centralizing it means that when Module 05 changes *how the insertion location is computed* (the adjusted
insertion location algorithm), no module has to change *how the splice itself happens* — only the location
argument passed in changes. One code path, many callers.

**`renderTree()` outputs the same `└─` / `├─` / `│` ASCII connectors as this course's `.tree` diagrams in
`templates/course.css`.**
**(c) our own convention**, chosen purely so a module's actual `node test/demo.js` output can be visually
diffed by eye against its `tutorial.html`'s prose diagrams — nothing in the spec or in Node.js suggests
this format.

---

## Decisions We Made

| Decision | Category | Why |
|---|---|---|
| Six token types incl. EOF as real member | (a) spec, with EOF as (c) convention | §13.2.5 vocabulary; EOF-as-token keeps dispatch uniform |
| `characterToken()` rejects length ≠ 1 | (c) convention | Protects Module 08's whole premise from being silently bypassed |
| End tag tokens have no `attrs` field | (a)+(c) | Spec discards them before tree construction ever sees them |
| `attrs` is a `Map`, not `{}` | (c) convention | No prototype-pollution surface; matches spec's "ordered map" framing |
| Tokens are plain objects; nodes are classes | (c) convention | Tokens are disposable values; nodes need stable identity over a lifecycle |
| Four node kinds only | (c) convention | Scoped to what Track 1/2 modules actually manipulate |
| Centralized `insertNode`/`tryFuseCharacter` | (c) convention | One splice implementation for every later module to call |
| ASCII-art `renderTree()` matches tutorial diagrams | (c) convention | Lets code output be eyeballed against tutorial prose |

## What We Proved

Running `node test/demo.js` (real output, captured verbatim, not reconstructed from memory):

```
── Token stream ──
<div class="a">
<p>
"h"
"i"
" "
<b>
"t"
"h"
"e"
"r"
"e"
</b>
</p>
</div>

── Rendered tree ──
#document
└─ div
   └─ p
      ├─ #text "hi "
      └─ b
         └─ #text "there"

OK — all assertions passed. Module 00 data structures verified.
```

This proves, with a real run rather than an assertion of intent:

1. `tokens.js` can represent every token shape needed for a nested-element-with-attribute-and-text input.
2. `nodes.js` can represent the corresponding DOM: `Document → Element → Element → (Text, Element → Text)`.
3. `tryFuseCharacter()` correctly merges three separate one-character `Character` tokens (`'h'`, `'i'`,
   `' '`) into a single `TextNode` with `data === "hi "` — the exact mechanism Module 09 depends on, proven
   here on an ordinary (non-fostered) insertion before Module 09 ever needs it under fostering conditions.
4. `characterToken()`'s single-character guard actually throws at runtime, not just in a docstring —
   verified separately: `RangeError: characterToken() takes exactly one character, got "hi" (length 2)...`.

Nothing here yet touches the stack of open elements, insertion modes, or foster parenting — that begins in
Module 01. Module 00's only claim is that the data structures those algorithms will operate on are correct
and safe to build on.
