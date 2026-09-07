'use strict';

const assert = require('node:assert/strict');
const { ElementNode, DocumentNode, insertNode } = require('../../00_tokens_and_nodes/src/nodes.js');
const { insertCharacterAtAppropriatePlace, insertElementAtAppropriatePlace } = require('../../05_seven_substeps/src/location.js');
const { tokenize } = require('../../01_stack_and_dispatch/src/tokenizer.js');
const { createParserState, NotImplementedYet } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { dispatch8 } = require('../../08_in_table_text/src/dispatch8.js');

console.log('── Part 1: object-identity fusion, not just matching output ──');
console.log('(no new source needed for this module — see DECISIONS.md for why)\n');

// Build <div>abc<table>... by hand, one call at a time, so we can grab a direct
// reference to the TextNode "abc" produces BEFORE the table (and the fostering it
// triggers) ever exists.
const doc = new DocumentNode();
const div = insertNode(doc, new ElementNode('div'));
const state1 = { fosterParentingEnabled: false, stack: [div], document: doc };

insertCharacterAtAppropriatePlace(state1, 'a');
insertCharacterAtAppropriatePlace(state1, 'b');
insertCharacterAtAppropriatePlace(state1, 'c');

const originalTextNode = div.children[0];
assert.equal(originalTextNode.data, 'abc');
console.log('Captured a direct reference to the "abc" TextNode before <table> exists.');

// Now insert <table> — ordinary insertion, current node is still div, flag is off.
insertElementAtAppropriatePlace(state1, 'table');
assert.equal(div.children.length, 2, 'div should now have exactly 2 children: the text node, then table');
assert.equal(div.children[1].tagName, 'table');

// Foster "d", "e", "f" — current node is now table (a fostering target), flag on.
state1.fosterParentingEnabled = true;
insertCharacterAtAppropriatePlace(state1, 'd');
insertCharacterAtAppropriatePlace(state1, 'e');
insertCharacterAtAppropriatePlace(state1, 'f');
state1.fosterParentingEnabled = false;

console.log('After fostering "d", "e", "f":');
console.log('  div.children.length =', div.children.length, '(must still be 2 — no new node created)');
console.log('  div.children[0] === originalTextNode ?', div.children[0] === originalTextNode);
console.log('  div.children[0].data =', JSON.stringify(div.children[0].data));

assert.equal(div.children.length, 2, 'fostering "d","e","f" must NOT create a third child — they must merge into the existing text node');
assert.equal(div.children[0], originalTextNode, 'the fostered text must merge into the SAME TextNode OBJECT that "abc" produced — not a new, equal-looking one');
assert.equal(originalTextNode.data, 'abcdef', 'the original object\'s .data must now read "abcdef"');

console.log('\nOK: object identity preserved. "abc" and "def" were never adjacent in the source — separated by');
console.log('an entire <table> element — yet in the DOM there is exactly one Text node, and it is the same');
console.log('JavaScript object the "abc" characters created. There is no boundary, no marker, nothing left');
console.log('to recover the original split from.\n');

console.log('── Part 2: fusion survives across SEPARATE fostering events, not just one loop ──');

// Three independent enable/disable cycles (as if three separate anything-else
// fallbacks fired for three isolated characters, rather than one buffered run) must
// still fuse into a single node, proving fusion doesn't depend on being inside one
// unbroken loop.
const doc2 = new DocumentNode();
const div2 = insertNode(doc2, new ElementNode('div'));
const table2 = insertNode(div2, new ElementNode('table'));
const state2 = { fosterParentingEnabled: false, stack: [table2], document: doc2 };

for (const ch of ['x', 'y', 'z']) {
  state2.fosterParentingEnabled = true;
  insertCharacterAtAppropriatePlace(state2, ch);
  state2.fosterParentingEnabled = false;
}

assert.equal(div2.children.length, 2, 'three separate fostering events for x, y, z must still produce only 2 children (text + table)');
assert.equal(div2.children[0].data, 'xyz', 'three separately-fostered characters must fuse into one "xyz" text node');
console.log('Three separate enable/disable cycles for x, y, z → one text node "xyz". OK.\n');

console.log('── Part 3: full engine, real input, same guarantee ──');
const html = '<!DOCTYPE html><head></head><body><div>abc<table>def</table></div></body>';
const tokens = tokenize(html);
const state3 = createParserState();
for (const token of tokens) {
  try {
    dispatch8(token, state3, () => {});
  } catch (err) {
    if (err instanceof NotImplementedYet) break;
    throw err;
  }
}
const htmlEl = state3.document.children.find((c) => c.tagName === 'html');
const body = htmlEl.children.find((c) => c.tagName === 'body');
const divEl = body.children.find((c) => c.tagName === 'div');
assert.equal(divEl.children.length, 2, 'the full engine must also produce exactly 2 children under <div>: one fused text node, then table');
assert.equal(divEl.children[0].data, 'abcdef');
console.log('Full dispatch8 engine on real input: div.children.length =', divEl.children.length, '| text =', JSON.stringify(divEl.children[0].data));

console.log('\nOK — all assertions passed. Module 09 text-node fusion verified at the object-identity level.');
