'use strict';

const assert = require('node:assert/strict');
const { tokenize } = require('../../01_stack_and_dispatch/src/tokenizer.js');
const { NotImplementedYet } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { ElementNode, TextNode, CommentNode } = require('../../00_tokens_and_nodes/src/nodes.js');
const { dispatch10, createParserState10 } = require('../src/dispatch10.js');

function serializeLikeBrowser(node, depth = 0, out = []) {
  const indent = '  '.repeat(depth);
  if (node instanceof ElementNode) out.push(indent + node.tagName);
  else if (node instanceof TextNode) out.push(indent + '#text ' + JSON.stringify(node.data));
  else if (node instanceof CommentNode) out.push(indent + '#comment ' + JSON.stringify(node.data));
  for (const child of node.children || []) serializeLikeBrowser(child, depth + 1, out);
  return out;
}

// The spec's own canonical example (§13.2.10.3), quoted in the attached reference
// course's own Module 08.
const html = '<!DOCTYPE html><head></head><body><table><b><tr><td>aaa</td></tr>bbb</table>ccc</body>';

console.log('── Input (the spec\'s own canonical example) ──');
console.log(html, '\n');

const tokens = tokenize(html);
const state = createParserState10();
let stoppedAt = null;
for (const [idx, token] of tokens.entries()) {
  try {
    dispatch10(token, state, () => {});
  } catch (err) {
    if (err instanceof NotImplementedYet) {
      stoppedAt = { idx, token };
      break;
    }
    throw err;
  }
}

const htmlEl = state.document.children.find((c) => c.tagName === 'html');
const body = htmlEl.children.find((c) => c.tagName === 'body');
const actual = serializeLikeBrowser(body).join('\n');

console.log('── Output ──');
console.log(actual);
if (stoppedAt) {
  console.log(`(stopped at token #${stoppedAt.idx}: ${stoppedAt.token.type} ${stoppedAt.token.tagName ?? ''} — expected; everything left only pops already-correct structure)`);
}

const EXPECTED = [
  'body',
  '  b',
  '  b',
  '    #text "bbb"',
  '  table',
  '    tbody',
  '      tr',
  '        td',
  '          #text "aaa"',
  '  b',
  '    #text "ccc"',
].join('\n');

assert.equal(actual, EXPECTED, 'engine output must match real browser DOMParser output: THREE <b> elements from one <b> tag');

const bElements = body.children.filter((c) => c.tagName === 'b');
assert.equal(bElements.length, 3, 'exactly three top-level <b> elements, from a single <b> tag in the source');
assert.equal(bElements[0].children.length, 0, 'the first <b> (fostered, then orphaned by clearing the stack) must be empty');
assert.equal(bElements[1].children[0].data, 'bbb', 'the second <b> (reconstructed inside the table) must contain "bbb"');
assert.equal(bElements[2].children[0].data, 'ccc', 'the third <b> (reconstructed after the table closed) must contain "ccc"');
assert.notEqual(bElements[0], bElements[1], 'the first and second <b> must be different objects — reconstruction creates a NEW element, not reuse');
assert.notEqual(bElements[1], bElements[2], 'the second and third <b> must be different objects too');

console.log(`\nThree distinct <b> objects confirmed: ${bElements.map((b) => `<b>${b.children[0]?.data ?? ''}</b>`).join(', ')}`);
console.log('\nOK — all assertions passed. Module 10 triple-<b> reconstruction verified against real browser output.');
