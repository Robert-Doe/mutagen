// Module 11 — tests. Run:  node test/demo.mjs
import assert from 'node:assert/strict';
import { setHTMLModel, setHTMLUnsafeModel, isClean, elementNames, hasLiveHandler } from '../src/native.mjs';
import { ALL_VECTORS } from '../../../track2-mxss/08-hardened-sanitizer/src/hardened.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  PASS ', n); } catch (e) { fail++; console.log('  FAIL ', n, '\n        ', e.message); } };

console.log('\nMODULE 11 — The Native Sanitizer API\n');

// ── setHTML model is clean for EVERY course vector — no round trip to exploit ──
for (const [name, payload] of Object.entries(ALL_VECTORS)) {
  t(`setHTML model is clean for: ${name}`, () => {
    assert.equal(isClean(setHTMLModel(payload)), true);
  });
}

t('benign markup survives setHTML model', () => {
  const tree = setHTMLModel('<p>hi <b>there</b> <a href="/x">link</a></p>');
  assert.deepEqual(elementNames(tree), ['p', 'b', 'a']);
});

t('the KEY property: no serialize step means no second parse', () => {
  // Track 2 sanitizers: parse -> filter -> SERIALIZE -> (browser) parse again.
  // setHTML: parse -> filter -> INSERT. The tree inspected IS the tree used.
  const payload = '<svg><style><a title="</style><img src=x onerror=alert(1)>"></a></style></svg>';
  const tree = setHTMLModel(payload);
  assert.equal(hasLiveHandler(tree), false);
  // there is no string output to re-parse; the assertion above is final.
});

t('setHTMLUnsafe does NOT sanitize — a plain <img onerror> survives', () => {
  const tree = setHTMLUnsafeModel('<img src=x onerror=alert(1)>');
  assert.equal(hasLiveHandler(tree), true);   // caller opted out of filtering
});

t('setHTMLUnsafe is still mutation-safe: it is a single parse, no round trip', () => {
  // even the "unsafe" variant doesn't have the sink-differential problem —
  // it just doesn't filter. The residual risk is caller error, not mXSS.
  const tree = setHTMLUnsafeModel('<noscript><img src=x onerror=alert(1)></noscript>');
  const names = elementNames(tree);
  // one parse, scripting on -> noscript content is text
  assert.deepEqual(names, ['noscript']);
});

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
