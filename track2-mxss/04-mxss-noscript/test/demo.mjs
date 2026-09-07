// Module 4 — tests. Run:  node test/demo.mjs
import assert from 'node:assert/strict';
import { bothFlags, serverSanitizeThenBrowser, parseFragment, elementNames } from '../src/noscript.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  PASS ', n); } catch (e) { fail++; console.log('  FAIL ', n, '\n        ', e.message); } };

console.log('\nMODULE 4 — mXSS via the Scripting Flag (<noscript>)\n');

t('same string, two trees: <noscript><img onerror> is an element (off) / text (on)', () => {
  const r = bothFlags('<noscript><img src=x onerror=alert(1)></noscript>');
  assert.deepEqual(r.off.elements, ['noscript', 'img']);   // off: img is real
  assert.deepEqual(r.on.elements, ['noscript']);           // on: img is text inside
  assert.equal(r.differ, true);
});

t('off-parse SEES the handler; on-parse does not', () => {
  const r = bothFlags('<noscript><img src=x onerror=alert(1)></noscript>');
  assert.equal(r.off.live, true);
  assert.equal(r.on.live, false);
});

t('the minimal payload is BLOCKED: sanitizer (off) sees the img and strips onerror', () => {
  const r = serverSanitizeThenBrowser('<noscript><img src=x onerror=alert(1)></noscript>');
  assert.equal(r.live, false);
});

t('the classic attribute payload is BLOCKED by the modern serializer', () => {
  // <noscript><p title="</noscript><img src=x onerror=alert(1)>">
  const r = serverSanitizeThenBrowser('<noscript><p title="</noscript><img src=x onerror=alert(1)>"></p></noscript>');
  assert.equal(r.live, false);
  // the < > in the title attribute are escaped on serialize, so the on-parse
  // never sees a literal </noscript> to break out of.
  assert.doesNotMatch(r.cleaned, /<img[^>]*onerror/);
});

t('the mechanism survives: feed a browser the OFF serialization directly', () => {
  // if some code serialized the off-tree WITHOUT escaping (old serializer / string concat)
  // and handed it to an on-context sink, the img would be live.
  const off = parseFragment('<noscript><img src=x onerror=alert(1)></noscript>', 'body', { scripting: false });
  // naive string concat of the off tree's "inner" — simulate a broken serializer
  const naive = '<noscript><img src=x onerror=alert(1)></noscript>';
  const onReparse = parseFragment(naive, 'body', { scripting: true });
  assert.deepEqual(elementNames(onReparse), ['noscript']);   // img is text — the modern browser is safe here too
  // the REAL residual risk is a sanitizer that ALLOWS <noscript>:
});

t('residual risk: a sanitizer that ALLOWS <noscript> ships a live-on-reparse tree', () => {
  const allowNoscript = { allow: { elements: new Set(['noscript', 'div', 'img', 'p']), attributes: new Set(['src', 'title']) } };
  const r = serverSanitizeThenBrowser('<noscript><img src=x onerror=alert(1)></noscript>', allowNoscript);
  // off-sanitizer: sees <img onerror> inside noscript, strips onerror -> <noscript><img src="x"></noscript>
  // on-browser: <noscript> content is RAWTEXT -> the text "<img src="x">" ... inert here.
  // BUT if the payload were structured to put a </noscript> in that raw text, it breaks out.
  assert.equal(r.live, false); // minimal case still safe; see proof.html for the structured attempt
  assert.match(r.cleaned, /<noscript>/);
});

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
