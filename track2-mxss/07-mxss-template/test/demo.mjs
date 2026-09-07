// Module 7 — tests. Run:  node test/demo.mjs
import assert from 'node:assert/strict';
import {
  forgetfulSanitize, thoroughSanitize, sanitizeThenExtractTemplate,
  parseFragment, elementNames, hasLiveHandler,
} from '../src/template.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  PASS ', n); } catch (e) { fail++; console.log('  FAIL ', n, '\n        ', e.message); } };

console.log('\nMODULE 7 — mXSS via <template> Reparenting\n');

const P = '<template><img src=x onerror=alert(1)></template>';

t('template content lands in .content, so a .children walk sees nothing', () => {
  const tree = parseFragment(P, 'body', { scripting: false });
  const tpl = tree.children[0];
  assert.equal(tpl.children.length, 0);                       // .children empty
  assert.equal(tpl.content.children[0].name, 'img');          // real content is here
});

t('forgetful sanitizer leaves the onerror INTACT inside the template', () => {
  const out = forgetfulSanitize(P);
  assert.match(out, /onerror="?alert\(1\)"?/);                // never scrubbed
});

t('...and when the app extracts the template content, it goes live', () => {
  const r = sanitizeThenExtractTemplate(P, forgetfulSanitize);
  assert.equal(r.live, true, `expected live after extraction. extracted=${r.extracted}`);
});

t('thorough sanitizer descends into .content and scrubs the onerror', () => {
  const out = thoroughSanitize(P);
  assert.doesNotMatch(out, /onerror/);
});

t('...so extraction is safe', () => {
  const r = sanitizeThenExtractTemplate(P, thoroughSanitize);
  assert.equal(r.live, false);
});

t('thorough sanitizer UNWRAPS <template> entirely (no fragment left to extract)', () => {
  const out = thoroughSanitize('<template><p>ok</p><img src=x onerror=alert(1)></template>');
  assert.doesNotMatch(out, /<template>/);
  assert.match(out, /<p>ok<\/p>/);
  assert.doesNotMatch(out, /onerror/);
});

t('nested templates: forgetful misses every level', () => {
  const r = sanitizeThenExtractTemplate(
    '<template><template><img src=x onerror=alert(1)></template></template>', forgetfulSanitize);
  assert.equal(r.live, true);
});

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
