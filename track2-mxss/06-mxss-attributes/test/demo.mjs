// Module 6 — tests. Run:  node test/demo.mjs
import assert from 'node:assert/strict';
import { bothSerializers, VECTORS, parseFragment, hasLiveHandler } from '../src/attributes.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  PASS ', n); } catch (e) { fail++; console.log('  FAIL ', n, '\n        ', e.message); } };

console.log('\nMODULE 6 — mXSS via Attribute Serialization\n');

for (const v of VECTORS) {
  const r = bothSerializers(v.payload);
  t(`${v.name}: source tree is SAFE (handler is data in an attribute)`, () => {
    assert.equal(r.parsedSafely, true);
  });
  t(`${v.name}: MODERN serializer keeps it safe on reparse`, () => {
    assert.equal(r.modern.live, false, `modern leaked: ${r.modern.out}`);
  });
}

t('the LEGACY serializer leaves a raw < inside the attribute; the MODERN one does not', () => {
  // A quoted attribute value protects < > from breaking the *HTML* re-parse either way
  // (the closing quote ends the value first). The legacy gap bit downstream consumers
  // that re-emitted the value UNQUOTED — old IE's serializer, and today: template
  // engines, XML pipelines, and the <template>/DSD extraction in Module 7.
  const r = bothSerializers('<x title="</style><img src=x onerror=alert(1)>"></x>');
  assert.match(r.legacy.out, /title="<\/style><img/);        // raw < survives serialization
  assert.doesNotMatch(r.modern.out, /title="<\/style>/);     // modern neutralises it
});

t('the class is CLOSED for HTML re-parse: no VECTOR fires with the modern serializer', () => {
  // The historical exploitation of the legacy gap needed a co-factor: old IE's
  // serializer emitting the value UNQUOTED, or the value flowing into a non-HTML
  // consumer (XML pipeline, template engine, the DSD/<template> extraction of
  // Module 7). Against a plain modern HTML re-parse, every vector is inert.
  for (const v of VECTORS) assert.equal(bothSerializers(v.payload).modern.live, false);
});

t('the difference is EXACTLY < and > in attribute values', () => {
  const r = bothSerializers('<x title="</style><img src=x onerror=alert(1)>"></x>');
  assert.match(r.modern.out, /title="&lt;\/style&gt;&lt;img src=x onerror=alert\(1\)&gt;"/);
  assert.match(r.legacy.out, /title="<\/style><img src=x onerror=alert\(1\)>"/);
});

t('a plain quote does NOT break out — the parser already closed the attr correctly', () => {
  // <a title='x"><img ...>'>  — the " is inside a '-quoted value; both serializers quote with "
  const r = bothSerializers(`<a title='x"><img src=x onerror=alert(1)>'></a>`);
  // parser saw: title = 'x"><img src=x onerror=alert(1)>'  — all data. serialize escapes the ".
  assert.equal(r.modern.live, false);
});

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
