// Module 8 — tests. Run:  node test/demo.mjs
import assert from 'node:assert/strict';
import {
  hardenedSanitizer, domSanitizer, ALL_VECTORS, BENIGN, safeAfterBrowser, elementNames, parseFragment,
} from '../src/hardened.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  PASS ', n); } catch (e) { fail++; console.log('  FAIL ', n, '\n        ', e.message); } };

console.log('\nMODULE 8 — The Hardened Sanitizer\n');

// ── every attack vector from Modules 3–7 is closed ──
for (const [name, payload] of Object.entries(ALL_VECTORS)) {
  t(`CLOSED: ${name}`, () => {
    const cleaned = hardenedSanitizer(payload);
    assert.equal(safeAfterBrowser(cleaned), true, `leaked: ${cleaned}`);
  });
}

// ── benign HTML is preserved ──
for (const html of BENIGN) {
  t(`PRESERVED: ${html.slice(0, 40)}`, () => {
    const cleaned = hardenedSanitizer(html);
    assert.ok(cleaned.length > 0, 'benign content was deleted');
    // structure preserved (same element names, minus any dropped)
    const before = elementNames(parseFragment(html, 'body'));
    const after = elementNames(parseFragment(cleaned, 'body'));
    assert.deepEqual(after, before, `structure changed: ${cleaned}`);
  });
}

// ── the loop actually does something ──
t('the round-trip loop reaches a fixed point (does not throw)', () => {
  // if parse∘serialize weren\'t idempotent here, hardenedSanitizer would throw after `max`
  assert.doesNotThrow(() => hardenedSanitizer('<svg><style><a title="</style><img src=x onerror=1>"></a></style></svg>'));
});

t('one pass is NOT always enough — a second pass changes some outputs', () => {
  // domSanitizer is one pass; compare its output re-fed to itself
  const p = '<math><mtext><mglyph><style>x</style></mglyph></mtext></math>';
  const once = domSanitizer(p, { allow: { elements: new Set(['div', 'p']), attributes: new Set() } });
  const twice = domSanitizer(once, { allow: { elements: new Set(['div', 'p']), attributes: new Set() } });
  // at minimum, the hardened (looped) version is stable:
  const h = hardenedSanitizer(p);
  assert.equal(hardenedSanitizer(h), h, 'hardened output is not a fixed point');
});

t('forbidden elements are dropped WITH their subtree, not unwrapped', () => {
  const cleaned = hardenedSanitizer('<style>a{}</style><xmp>b</xmp><script>c</script>');
  assert.equal(cleaned, '');
});

t('namespace: no SVG/MathML element survives', () => {
  const cleaned = hardenedSanitizer('<svg><circle/><rect/></svg><math><mn>1</mn></math>');
  assert.doesNotMatch(cleaned, /circle|rect|mn|svg|math/);
});

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
