# GLOSSARY.md

Alphabetical. **Append-only** — never rewrite this file, only insert new rows in order.
Each term is tagged with the module it is **first seen** in this course. Terms defined in the
sibling courses (tokenizer states, foster parenting internals, CSP directives) are not
repeated here unless this course uses them in a new way.

---

**adjusted current node** — In foreign-content parsing, the element whose parsing rules
currently apply: normally the top of the stack of open elements, but the *context element*
when parsing a fragment. Deciding it wrong is one route into namespace-confusion mXSS.
*First seen: Module 1.*

**breakout tag** — An HTML start tag (`<b>`, `<p>`, `<img>`, `<table>`, …) that, when the
parser is in foreign content, forces it to pop every foreign element off the stack and return
to HTML parsing. *First seen: Prerequisite 1 / Module 1.*

**character reference** — `&lt;`, `&#60;`, `&#x3c;` — an encoded character. Decoded in some
contexts (attribute values, RCDATA) and not others (RAWTEXT, comments). *First seen:
Prerequisite 7.* (Full treatment: Browser Tokenization Module 4.)

**classifyHinge** — Module 10's function: given a payload and its serialization, name which
of the five mechanism families (raw-text, namespace, scripting flag, attribute, template) is
the "hinge" — the one step that, if changed, closes the mutation. *First seen: Module 10.*

**context element** — the element a fragment parse pretends the string is already inside
(`element.innerHTML = str` → `element` is the context). Seeds the insertion mode; can drop
the parser straight into RAWTEXT, a table, or a foreign namespace. *First seen: Module 1.*
See [[fragment-parsing]].

**content model** — The rule set governing how an element's children are parsed: normal,
void, RAWTEXT, RCDATA, or foreign. *First seen: Prerequisite 6.*

**DOM clobbering** — A distinct attack: injecting named elements (`<a id=x>`) so that
`window.x` / `document.x` resolves to an attacker-controlled node instead of the expected
value. Named here only to keep it separate from mXSS. *First seen: Module 3 vocabulary web.*

**fixed point** — A value `x` where `f(x) = x`. A sanitizer's parse→serialize step must be
run until it reaches one, or the browser's final parse can differ from the approved tree.
*First seen: Prerequisite 9.*

**foreign content** — The parser mode entered at `<svg>` / `<math>`, using the SVG / MathML
namespace and a different tokenizer rule set. *First seen: Prerequisite 1 / Module 1.*

**fragment parsing** — Parsing a string in the context of a specific element (what
`element.innerHTML = str` does), rather than as a whole document. The context element seeds
the insertion mode and can put the parser directly into RAWTEXT, table, or foreign mode.
*First seen: Module 1.*

**hardened sanitizer** — Module 8's sanitizer: DOM walk + (1) loop to a string fixed point,
(2) enforce the HTML namespace, (3) forbid/unwrap the mutating elements, (4) scrub attributes
on every surviving node. Closes all 12 course vectors. Maps 1:1 to DOMPurify mechanisms.
*First seen: Module 8.*

**hinge** — see [[classifyHinge]]. The single parse/serialize/sanitize step a mutation
depends on. *First seen: Module 10.*

**HTML integration point** — A foreign element (`<svg><foreignObject>`, `<svg><desc>`,
`<svg><title>`, `<math><annotation-xml encoding=text/html>`) whose content is parsed under
HTML rules. *First seen: Prerequisite 1 / Module 1.*

**idempotent** — `f(f(x)) = f(x)` for all `x`. HTML parse∘serialize is *not* idempotent; that
non-idempotency is the mathematical core of mXSS. *First seen: Prerequisite 9.*

**integration point** — Umbrella term for HTML integration points and MathML text integration
points. *First seen: Prerequisite 1 / Module 1.*

**mutation XSS (mXSS)** — Cross-site scripting caused by the browser re-parsing a sanitizer's
serialized output into a different tree than the sanitizer inspected and approved, where the
new tree executes script. *First seen: Module 3.* (Mechanism first shown: Browser Tokenization
Module A3; table-shaped slice: Foster Parenting Track 2.)

**namespace** — One of three element vocabularies in an HTML document: HTML
(`http://www.w3.org/1999/xhtml`), SVG (`http://www.w3.org/2000/svg`), MathML
(`http://www.w3.org/1998/Math/MathML`). Carried by every element as `el.namespaceURI`.
*First seen: Prerequisite 1.*

**namespace confusion** — mXSS in which markup that is inert inside the SVG or MathML
namespace becomes live HTML once the foreign wrapper is removed or the namespace boundary is
miscomputed. The DOMPurify bypass family. *First seen: Module 5.*

**`<mglyph>` / `<malignmark>` exception** — inside a MathML text integration point, these two
elements do *not* switch to HTML — they stay MathML. The hinge of the `<math><mtext><mglyph>
<style>` bypass. *First seen: Module 1 / Module 5.*

**Sanitizer API** — the native browser API: `Element.setHTML()`, `setHTMLUnsafe()`,
`Document.parseHTMLUnsafe()`, and the `Sanitizer` config object. Parses once, filters the
tree, inserts — no serialize step, so no round trip. Mutation-safe by construction. In
Chrome 148 by default. *First seen: Module 11.*

**`setHTML()`** — see [[Sanitizer API]]. `element.setHTML(str, {sanitizer})`. *First seen:
Module 11.*

**`setHTMLUnsafe()`** — parses (no script execution) but does *not* filter. Still
single-parse, so still mXSS-immune; residual risk is ordinary DOM XSS from caller error.
*First seen: Module 11.*

**sink** — a place a string becomes DOM: `innerHTML`, `outerHTML`, `DOMParser`,
`Range.createContextualFragment`, `template.innerHTML`, `document.write`, plus `XMLSerializer`
in reverse. The seven don't agree; mXSS is the (sanitizer sink, app sink) pairs that
disagree. *First seen: Module 9.*

**parser differential** — two ways of turning the same string into DOM that produce different
trees. mXSS is one instance. *First seen: Module 9.*

**payload** — The minimal markup that demonstrates script execution; in this course almost
always `<img src=x onerror=alert(1)>`. *First seen: Prerequisite 10.*

**RAWTEXT** — Content model where children are literal text with no entity decoding and no
nested tags; only the matching end tag closes it. `<style>`, `<script>`, `<xmp>`,
`<iframe>`, `<noembed>`, `<noframes>`, and `<noscript>` when scripting is enabled. *First
seen: Prerequisite 6.*

**RCDATA** — Like RAWTEXT but entities *are* decoded. `<title>`, `<textarea>`. *First seen:
Prerequisite 6.*

**round-trip** — The cycle parse → serialize → parse. The unit of analysis for every mXSS in
this course. *First seen: Module 2.*

**scripting flag** — A boolean input to the HTML parser, fixed per parse. Its only effect is
whether `<noscript>` content is RAWTEXT (enabled) or normal markup (disabled). Browsers:
enabled. `DOMParser`, `<template>`, jsdom-by-default: disabled. *First seen: Prerequisite 2.*

**serialization** — Tree → string; what reading `element.innerHTML` returns. Governed by
WHATWG §13.3, a separate algorithm from parsing, not designed as its exact inverse. *First
seen: Prerequisite 4 / Module 2.*

**serializer, legacy vs modern** — the pre-~2020 attribute serializer escaped only `&` and
`"`; the modern one also escapes `<` and `>` in attribute values. That two-character
addition closed a whole generation of mXSS payloads. *First seen: Module 6.* (`escapeAttr` /
`escapeAttrLegacy` in `lab.mjs`.)

**raw-text emission** — the serializer writes the text content of `<style> <script> <xmp>
<iframe> <noembed> <noframes> <noscript> <plaintext>` **verbatim**, no escaping. The raw
material of Modules 3 and 5. *First seen: Module 2.*

**wrapper removal** — An mXSS technique: a sanitizer deletes a disallowed element
(`<title>`, `<style>`, `<svg>`) but keeps its children/text, which then re-parse under the
now-different rules of the surviving parent. *First seen: Module 3.*
