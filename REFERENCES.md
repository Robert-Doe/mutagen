# REFERENCES.md

The bibliography. **Append-only.** Cited from module tutorials and deep dives by number,
e.g. `[R3]`. Every claim that rests on an external source names it here.

---

## Specifications

- **[R1]** WHATWG HTML Standard, §13.2 "Parsing HTML documents" — tree construction,
  insertion modes, the stack of open elements, foreign content.
  <https://html.spec.whatwg.org/multipage/parsing.html>
- **[R2]** WHATWG HTML Standard, §13.2.6.5 "The rules for parsing tokens in foreign content"
  (breakout tags, integration points, CDATA, self-closing).
  <https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inforeign>
- **[R3]** WHATWG HTML Standard, §13.3 "Serialising HTML fragments" — the `innerHTML` getter
  algorithm, and its own note that the result is **not guaranteed to round-trip**.
  <https://html.spec.whatwg.org/multipage/parsing.html#serialising-html-fragments>
- **[R4]** WHATWG HTML Standard, §13.4 "Parsing HTML fragments" — the fragment parsing
  algorithm and the role of the context element.
  <https://html.spec.whatwg.org/multipage/parsing.html#parsing-html-fragments>
- **[R5]** WHATWG HTML Standard — the scripting flag, §13.2.1.
  <https://html.spec.whatwg.org/multipage/parsing.html#scripting-flag>
- **[R6]** DOM Standard — `Element.setHTML()`, `Element.setHTMLUnsafe()`,
  `Document.parseHTMLUnsafe()`, and the Sanitizer API.
  <https://developer.mozilla.org/en-US/docs/Web/API/HTML_Sanitizer_API>

## Foundational research

- **[R7]** Mario Heiderich, Jörg Schwenk, Tilman Frosch, Jonas Magazinius, Edward Z. Yang.
  **"mXSS Attacks: Attacking well-secured Web-Applications by using innerHTML Mutations."**
  ACM CCS 2013. The paper that named mutation XSS.
- **[R8]** Mario Heiderich. **"Got Your Nose! How to Steal Your Precious Data Without Using
  Scripts"** and the DOMPurify design writeups (cure53).

## DOMPurify bypasses and patches (reproduced in Module 10)

- **[R9]** Michał Bentkowski. **"Mutation XSS in Google Search."** securitum / research.
  securitum.com, 2019. The `<noscript>` scripting-flag disclosure.
- **[R10]** Michał Bentkowski. **"Write-up of DOMPurify 2.0.0 bypass using mutation XSS."**
  research.securitum.com, 2019 — namespace confusion via `<form>` / `<math>` / `<mglyph>`.
- **[R11]** Masato Kinugawa — assorted DOMPurify bypasses (GitHub issues on cure53/DOMPurify),
  2015–2023.
- **[R12]** DOMPurify CHANGELOG and the security-relevant commits for 2.0.17, 2.2.2, 2.2.4,
  2.3.x, 2.4.x, 3.0.x. <https://github.com/cure53/DOMPurify/blob/main/CHANGELOG.md>
- **[R13]** SonarSource / Sonar research — "Securing Developer Tools" and mXSS write-ups.
- **[R14]** Kevin Mizu — HTML sanitiser bypass research, 2023–2024.
- **[R15]** AMP4Email / Gmail XSS (Bentkowski, 2019) — mXSS in an AMP context.

## Sibling courses (in `RecentInnerDesktop/`)

- **[S1]** `bob_browser_tokenization` — the from-scratch HTML tokenizer (68 states, JS + Java),
  plus `modules/a1` (minimal tree builder), `a2` (tokenizer-based sanitizer), `a3` (the mXSS
  mechanism, browser-verified).
- **[S2]** `bob_foster_parenting` — the from-scratch tree-construction engine, foster
  parenting in full, and Track 2's table-shaped mXSS (`what mXSS is`, `naive sanitizer break`,
  `whitespace fusion`, `idempotent serialization`, `case studies`).
- **[S3]** `bob_CSP_trusted_types` — CSP and Trusted Types from scratch (24 modules),
  including the default policy, HTML/script sink guards, and the sanitizer capstone.

## Verification environment

- **[V1]** Claude in-app browser, Chrome 148.0.7778.280 (Windows), used as the live oracle for
  every "the alert fires" / "the tree looks like this" claim. Node.js v22.14.0 for all
  from-scratch code.
