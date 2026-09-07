// Module 1 — tests. Run:  node test/demo.mjs
// Every `expect` value was first captured from Chrome 148 (DOMParser) and is
// re-checked here against our engine. If the two ever disagree, the browser
// wins and this file is what tells you.

import assert from 'node:assert/strict';
import { parseFragment, serialize, treeString, nsMap, innerHTMLModel } from '../src/foreign.mjs';

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  PASS ', name); }
  catch (e) { fail++; console.log('  FAIL ', name, '\n        ', e.message); }
}

console.log('\nMODULE 1 — Foreign Content & the Fragment Parser\n');

t('svg <style> is NOT rawtext: <def> is an element, not text', () => {
  const tree = parseFragment('<svg><style>abc<def>ghi</def></style></svg>', 'body');
  assert.equal(serialize(tree), '<svg><style>abc<def>ghi</def></style></svg>');
});

t('HTML <style> IS rawtext: <img> is text', () => {
  const tree = parseFragment('<style><img src=x onerror=alert(1)></style>', 'body');
  assert.equal(serialize(tree), '<style><img src=x onerror=alert(1)></style>');
});

t('<svg><p> breaks out: <p> is HTML, sibling of <svg>', () => {
  const tree = parseFragment('<svg><p>hi</p></svg>', 'body');
  const map = nsMap(tree);
  assert.deepEqual(map, [{ name: 'svg', ns: 'svg' }, { name: 'p', ns: 'html' }]);
});

t('SVG integration point <desc>: <img> inside is a live HTML element', () => {
  const tree = parseFragment('<svg><desc><img src=x onerror=1></desc></svg>', 'body');
  const map = nsMap(tree);
  assert.deepEqual(map, [
    { name: 'svg', ns: 'svg' }, { name: 'desc', ns: 'svg' }, { name: 'img', ns: 'html' },
  ]);
});

t('MathML text integration point <mtext>: <b> inside is HTML', () => {
  const tree = parseFragment('<math><mtext><b>x</b></mtext></math>', 'body');
  const map = nsMap(tree);
  assert.equal(map.find(e => e.name === 'b').ns, 'html');
});

t('CDATA is text directly in foreign content (not an integration point)', () => {
  const tree = parseFragment('<svg><![CDATA[x<y]]></svg>', 'body');
  // text node "x<y" -> serialized as x&lt;y ; NOT a comment
  assert.match(serialize(tree), /<svg>x&lt;y<\/svg>/);
});

t('CDATA inside an HTML integration point is a bogus comment (HTML rules)', () => {
  const tree = parseFragment('<svg><desc><![CDATA[x<y]]></desc></svg>', 'body');
  assert.match(serialize(tree), /<!--\[CDATA\[x<y\]\]-->/);
});

t('context element <textarea> drops the parse straight into RCDATA', () => {
  // element.innerHTML = "<img src=x onerror=alert(1)>" on a <textarea>
  const tree = innerHTMLModel('textarea', '<img src=x onerror=alert(1)>');
  assert.equal(tree.children[0].type, 'text');                       // NOT an element — inert
  assert.equal(serialize(tree), '&lt;img src=x onerror=alert(1)&gt;'); // getter escapes it
});

t('context element <div> parses the same string as a LIVE element', () => {
  const tree = innerHTMLModel('div', '<img src=x onerror=alert(1)>');
  assert.equal(tree.children[0].type, 'element');
  assert.equal(tree.children[0].name, 'img');
});

t('svg case-correction: foreignobject -> foreignObject', () => {
  const tree = parseFragment('<svg><foreignobject></foreignobject></svg>', 'body');
  assert.match(serialize(tree), /foreignObject/);
});

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
