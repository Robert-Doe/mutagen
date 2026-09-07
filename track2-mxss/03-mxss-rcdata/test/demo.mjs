// Module 3 — tests. Run:  node test/demo.mjs
import assert from 'node:assert/strict';
import {
  domSanitizer, regexSanitizer, throughSanitizerThenBrowser,
  serializerEscapesPromotedText, RAW_TEXT_PARENTS,
} from '../src/rcdata.mjs';
import { STRICT } from '../src/rcdata.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  PASS ', n); } catch (e) { fail++; console.log('  FAIL ', n, '\n        ', e.message); } };

console.log('\nMODULE 3 — mXSS via RCDATA / Rawtext Wrapper Removal\n');

// ── 1. the naive rawtext mXSS is BLOCKED by the DOM sanitizer ──
for (const p of [
  '<title><img src=x onerror=alert(1)></title>',
  '<style><img src=x onerror=alert(1)></style>',
  '<xmp><img src=x onerror=alert(1)></xmp>',
  '<textarea><img src=x onerror=alert(1)></textarea>',
  '<noembed><img src=x onerror=alert(1)></noembed>',
]) {
  t(`BLOCKED: ${p}`, () => {
    const r = throughSanitizerThenBrowser(p, STRICT);
    assert.equal(r.live, false, `handler went live! cleaned=${r.cleaned}`);
  });
}

// ── 2. WHY it's blocked: promoted text is escaped by the serializer ──
// (parser-rawtext / rcdata elements only; <noscript> is scripting-flag dependent
//  — Module 4 — and <plaintext> can't be closed so it never "promotes")
for (const w of ['style', 'script', 'xmp', 'iframe', 'noembed', 'noframes', 'title', 'textarea']) {
  t(`serializer escapes text promoted out of <${w}>`, () => {
    const out = serializerEscapesPromotedText(w);
    assert.match(out, /&lt;img/);
    assert.doesNotMatch(out, /<img src=x onerror/);
  });
}

// ── 3. the string filter is a different story ──
t('regex sanitizer: bypassed by "/" instead of whitespace before on*', () => {
  const out = regexSanitizer('<img/onerror=alert(1)//src=x>');
  assert.match(out, /onerror=alert\(1\)/);          // NOT stripped
});

t('regex sanitizer: bypassed by an entity-encoded scheme', () => {
  const out = regexSanitizer('<a href=&#106;avascript:alert(1)>x</a>');
  assert.match(out, /&#106;avascript:/);            // NOT rewritten
});

t('DOM sanitizer: NOT bypassed by either of those', () => {
  assert.doesNotMatch(domSanitizer('<img/onerror=alert(1)//src=x>', STRICT), /onerror/);
  assert.doesNotMatch(domSanitizer('<a href=&#106;avascript:alert(1)>x</a>', STRICT), /javascript:/i);
});

// ── 4. the crack: remove the "promoted text is escaped" assumption and it's back ──
t('if the wrapper is KEPT (allowed), raw serialization is a live hazard on reparse', () => {
  // allow <style>; its text content is emitted RAW; a </style> in that text
  // breaks out on the next parse. (Full exploit needs a namespace/template — Module 5/7.)
  const allowStyle = { allow: { elements: new Set(['style', 'div', 'img']), attributes: new Set(['src']) } };
  const cleaned = domSanitizer('<style>a{}</style>b', allowStyle);
  assert.match(cleaned, /<style>a\{\}<\/style>/);   // style + its raw text survive verbatim
});

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
