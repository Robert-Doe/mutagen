// Module 2 — tests. Run:  node test/demo.mjs
import assert from 'node:assert/strict';
import { serialize, parseFragment, idempotencyReport, serializeModernVsLegacy } from '../src/serializer.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  PASS ', n); } catch (e) { fail++; console.log('  FAIL ', n, '\n        ', e.message); } };

console.log('\nMODULE 2 — The Serializer, and Why It Won\'t Round-Trip\n');

// ── serialization rules (each captured from Chrome 148 first) ──
t('text: < > & are escaped', () => {
  const tree = parseFragment('<p>1 < 2 & 3 > 4</p>', 'body');
  assert.equal(serialize(tree), '<p>1 &lt; 2 &amp; 3 &gt; 4</p>');
});

t('attribute value: < > & " are escaped (modern serializer)', () => {
  const tree = parseFragment('<div title=\'a<b>c&d"e\'></div>', 'body');
  assert.equal(serialize(tree), '<div title="a&lt;b&gt;c&amp;d&quot;e"></div>');
});

t('<style> content is emitted RAW — no escaping', () => {
  const tree = parseFragment('<style>a<b>c & d</style>', 'body');
  assert.equal(serialize(tree), '<style>a<b>c & d</style>');   // matches Chrome 148 exactly
});

t('<xmp> content is emitted RAW', () => {
  const tree = parseFragment('<xmp>x < y & z</xmp>', 'div');
  assert.equal(serialize(tree), '<xmp>x < y & z</xmp>');
});

t('void elements get no close tag', () => {
  const tree = parseFragment('<img src=x><br>', 'body');
  assert.equal(serialize(tree), '<img src="x"><br>');
});

t('structural normalization: an unclosed <b> is closed on serialize', () => {
  const tree = parseFragment('a<b>c', 'body');
  assert.equal(serialize(tree), 'a<b>c</b>');
});

// ── non-idempotency ──
t('serialize(parse(x)) != x for a<b>c  (needs 1 round to stabilise)', () => {
  const r = idempotencyReport('a<b>c');
  assert.equal(r.firstPassChangesString, true);
  assert.equal(r.reachedFixedPoint, true);
});

t('the <svg><style> case needs TWO rounds to reach a fixed point', () => {
  const r = idempotencyReport('<svg><style><a title="</style><img src=x onerror=1>"></a></style></svg>');
  assert.equal(r.rounds, 2);                       // matches Chrome 148: [s0, s1, s1]
  assert.equal(r.steps[1], r.steps[2]);            // stable after round 2
  assert.notEqual(r.steps[0], r.steps[1]);         // round 1 already changed it
});

t('modern vs legacy serializer differ exactly on < > in attributes', () => {
  const { modern, legacy, differ } = serializeModernVsLegacy('<div title=\'</style><img>\'></div>');
  assert.equal(differ, true);
  assert.match(modern, /&lt;\/style&gt;&lt;img&gt;/);
  assert.match(legacy, /<\/style><img>/);
});

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
