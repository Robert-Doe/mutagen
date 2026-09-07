// Module 9 — tests. Run:  node test/demo.mjs
import assert from 'node:assert/strict';
import { sinkDifferential, sinksDisagree, xmlSerialize, parseFragment, treeString } from '../src/sinks.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  PASS ', n); } catch (e) { fail++; console.log('  FAIL ', n, '\n        ', e.message); } };

console.log('\nMODULE 9 — Parser Differentials: the Sink Zoo\n');

t('<noscript><img onerror>: DOMParser (off) and innerHTML (on) disagree', () => {
  const d = sinkDifferential('<noscript><img src=x onerror=alert(1)></noscript>');
  assert.notDeepEqual(
    d['DOMParser (scripting off)'].elements,
    d['innerHTML (body, scripting on)'].elements);
});

t('the same string is "live" through one sink and not another', () => {
  const d = sinkDifferential('<noscript><img src=x onerror=alert(1)></noscript>');
  assert.equal(d['DOMParser (scripting off)'].live, true);
  assert.equal(d['innerHTML (body, scripting on)'].live, false);
});

t('context matters: <style>x parses as text-holder in <div> vs element-holder in <svg>', () => {
  const asDiv = treeString(parseFragment('<style><b>x</b></style>', 'div')).join('|');
  const asSvg = treeString(parseFragment('<style><b>x</b></style>', 'svg')).join('|');
  assert.notEqual(asDiv, asSvg);          // <div> ctx: <b> is text ; <svg> ctx: <b> is an element
});

t('XML serialization self-closes empty elements — <div></div> becomes <div/>', () => {
  const xml = xmlSerialize(parseFragment('<div></div><span>x</span>', 'body'));
  assert.match(xml, /<div \/>/);          // <div/> — reparses as self-closing in XML, NOT in HTML
  assert.match(xml, /<span>x<\/span>/);
});

t('sinksDisagree flags a string where the model sinks diverge', () => {
  assert.equal(sinksDisagree('<noscript><img src=x onerror=1></noscript>'), true);
  assert.equal(sinksDisagree('<p>plain text</p>'), false);
});

t('mXSS is just one cell of this table: sanitizer-context vs sink-context', () => {
  // sanitizer parses as template.innerHTML (off); sink is element.innerHTML (on)
  const d = sinkDifferential('<noscript><img src=x onerror=alert(1)></noscript>');
  assert.equal(d['template.innerHTML (off)'].live, true);            // what the sanitizer inspects
  assert.equal(d['innerHTML (body, scripting on)'].live, false);     // what the browser builds
  // the mismatch IS the mutation-XSS opportunity
});

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
