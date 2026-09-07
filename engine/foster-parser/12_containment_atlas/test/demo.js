'use strict';

const assert = require('node:assert/strict');
const { tokenize } = require('../../01_stack_and_dispatch/src/tokenizer.js');
const { NotImplementedYet } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { dispatch12, createParserState12 } = require('../src/dispatch12.js');
const { CONTAINMENT_ATLAS } = require('../src/containment_atlas.js');

console.log('── The MERGE tactic: a second <html> tag merges attributes, creates no new node ──\n');

const html = '<!DOCTYPE html><html foo="1"><head></head><body><html bar="2" foo="override"></body></html>';
console.log(html, '\n');

const tokens = tokenize(html);
const state = createParserState12();
for (const token of tokens) {
  try {
    dispatch12(token, state, () => {});
  } catch (err) {
    if (err instanceof NotImplementedYet) break;
    throw err;
  }
}

const htmlElements = [];
(function walk(node) {
  if (node.tagName === 'html') htmlElements.push(node);
  for (const child of node.children || []) walk(child);
})(state.document);

const root = htmlElements[0];
console.log('Number of <html> ELEMENT objects in the tree:', htmlElements.length);
console.log('Root <html> attrs:', [...root.attrs.entries()].map(([k, v]) => `${k}="${v}"`).join(' '));

assert.equal(htmlElements.length, 1, 'exactly one <html> element must exist — the second tag must not create a new node');
assert.equal(root.attrs.get('foo'), '1', 'the FIRST occurrence of a duplicate attribute wins — "1", not "override"');
assert.equal(root.attrs.get('bar'), '2', 'a NEW attribute name from the second tag must still be added');

console.log('\nOK: exactly one <html> node; foo="1" (first wins), bar="2" (new attribute added).\n');

// ── The containment atlas itself ──
console.log('── The containment atlas: every tactic this course names, and what\'s built ──\n');

const implementedCount = CONTAINMENT_ATLAS.filter((row) => row.implemented).length;
for (const row of CONTAINMENT_ATLAS) {
  const status = row.implemented ? `IMPLEMENTED (${row.implemented})` : `not implemented — ${row.reason}`;
  console.log(`${row.element}`.padEnd(58), '|', row.tactic.padEnd(20), '|', status);
}

assert.ok(implementedCount >= 5, 'at least five distinct tactics/rows should be backed by real, tested code by Module 12');

console.log(`\n${implementedCount} of ${CONTAINMENT_ATLAS.length} atlas rows are backed by real, tested code in this engine;`);
console.log('the rest are honestly scoped out, each with a specific, named reason.');
console.log('\nOK — all assertions passed. Module 12 containment atlas verified.');
