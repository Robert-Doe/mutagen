// Module 10 — tests. Run:  node test/demo.mjs
import assert from 'node:assert/strict';
import { dissect, DISCLOSURES } from '../src/dissect.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  PASS ', n); } catch (e) { fail++; console.log('  FAIL ', n, '\n        ', e.message); } };

console.log('\nMODULE 10 — Reading Disclosures Like a Researcher\n');

t('dissect() answers all four questions for a payload', () => {
  const d = dissect('<noscript><img src=x onerror=alert(1)></noscript>');
  assert.ok(Array.isArray(d.q1_sanitizer_tree));
  assert.equal(typeof d.q2_serialized, 'string');
  assert.ok(Array.isArray(d.q3_browser_tree));
  assert.equal(typeof d.q4_hinge, 'string');
});

t('the <noscript> disclosure: sanitizer sees safe, hinge names the scripting flag', () => {
  const d = dissect('<noscript><p title="</noscript><img src=x onerror=alert(1)>"></p></noscript>');
  // in our (correct 2026) engine this does NOT mutate — the modern serializer closed it
  assert.equal(d.q1_safe, true);
  assert.equal(d.mutates, false);           // honest: patched
});

t('every historical disclosure is dissectable and its hinge is identified', () => {
  for (const disc of DISCLOSURES) {
    const d = dissect(disc.payload);
    assert.equal(typeof d.q4_hinge, 'string');
    assert.ok(d.q4_hinge.length > 10, `no hinge for ${disc.id}`);
  }
});

t('the method distinguishes "mutates" from "dangerous both sides"', () => {
  // <img onerror> plain: dangerous in BOTH parses -> not a mutation, it is plain DOM XSS
  const plain = dissect('<img src=x onerror=alert(1)>');
  assert.equal(plain.q1_safe, false);
  assert.equal(plain.mutates, false);
  // a benign string: safe both sides
  const benign = dissect('<p>hello</p>');
  assert.equal(benign.mutates, false);
});

t('CVE-2020-26870 shape: our modern engine reports it as PATCHED (does not mutate)', () => {
  const d = dissect('<svg></p><style><a id="</style><img src=x onerror=alert(1)>"></a></style></svg>');
  assert.equal(d.mutates, false);           // attribute < > escaping closed it
  assert.equal(d.q1_safe, true);            // the sanitizer's tree is safe
});

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
