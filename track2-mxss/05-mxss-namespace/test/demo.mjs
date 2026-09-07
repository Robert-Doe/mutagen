// Module 5 — tests. Run:  node test/demo.mjs
import assert from 'node:assert/strict';
import { VECTORS, report, parseFragment, elementNames, hasLiveHandler } from '../src/namespace.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  PASS ', n); } catch (e) { fail++; console.log('  FAIL ', n, '\n        ', e.message); } };

console.log('\nMODULE 5 — mXSS via Namespace Confusion (SVG / MathML)\n');

// mechanism: the engine reproduces the browser's tree for each vector
t('<mglyph> keeps <style> in MathML (not rawtext)', () => {
  const tree = parseFragment('<math><mtext><mglyph><style><img src=x onerror=1></style></mglyph></mtext></math>', 'body');
  const names = elementNames(tree);
  assert.ok(names.includes('style') && names.includes('img'));  // img is a real element, not text
});

t('HTML parses <image> as an element that fires as an img', () => {
  const tree = parseFragment('<svg><image href=x onerror=alert(1)></svg>', 'body');
  assert.ok(hasLiveHandler(tree));
});

// the point: naive sanitizer fails, correct sanitizer holds — for every vector.
// "form double-nest" needs a real live-NodeList to reproduce the iterator skip;
// its naive leak is verified in proof.html (Chrome 148), not here.
const NODE_REPRODUCES = new Set(['mtext/mglyph/style', 'image alias', 'svg p breakout']);
for (const v of VECTORS) {
  const r = report(v);
  if (NODE_REPRODUCES.has(v.name)) {
    t(`NAIVE sanitizer is defeated by: ${v.name}`, () => {
      assert.equal(r.naive.live, true, `naive should leak but didn't. out=${r.naive.out}`);
    });
  }
  t(`CORRECT sanitizer (snapshot + ns check + <image> fix) blocks: ${v.name}`, () => {
    assert.equal(r.correct.live, false, `correct leaked! out=${r.correct.out}`);
  });
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
