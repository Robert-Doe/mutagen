'use strict';

const assert = require('node:assert/strict');
const { tokenize } = require('../../01_stack_and_dispatch/src/tokenizer.js');
const { createParserState, NotImplementedYet } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { ElementNode, TextNode, CommentNode } = require('../../00_tokens_and_nodes/src/nodes.js');
const { dispatch5 } = require('../src/dispatch5.js');

// Serializes exactly like the browser-verification script this module's DECISIONS.md
// documents (2-space indent per depth, lowercase tag name, or "#text <json>") so the
// two can be compared as plain strings — no format-translation ambiguity.
function serializeLikeBrowser(node, depth = 0, out = []) {
  const indent = '  '.repeat(depth);
  if (node instanceof ElementNode) {
    out.push(indent + node.tagName);
  } else if (node instanceof TextNode) {
    out.push(indent + '#text ' + JSON.stringify(node.data));
  } else if (node instanceof CommentNode) {
    out.push(indent + '#comment ' + JSON.stringify(node.data));
  }
  for (const child of node.children || []) serializeLikeBrowser(child, depth + 1, out);
  return out;
}

function runToCompletion(html) {
  const tokens = tokenize(html);
  const state = createParserState();
  let stoppedAt = null;
  for (const [idx, token] of tokens.entries()) {
    try {
      dispatch5(token, state, () => {});
    } catch (err) {
      if (err instanceof NotImplementedYet) {
        stoppedAt = { idx, token, err };
        break;
      }
      throw err;
    }
  }
  const html_ = state.document.children.find((c) => c.tagName === 'html');
  const body = html_.children.find((c) => c.tagName === 'body');
  return { state, body, stoppedAt };
}

// ── Case 1: real DOMParser output (captured from a live browser via this module's
// own DECISIONS.md verification session) for
// '<!DOCTYPE html><head></head><body><div>abc<table>def</table></div></body>':
const EXPECTED_TREE_1 = ['body', '  div', '    #text "abcdef"', '    table'].join('\n');

console.log('── Case 1: <div>abc<table>def</table></div> ──');
const case1 = runToCompletion('<!DOCTYPE html><head></head><body><div>abc<table>def</table></div></body>');
const actual1 = serializeLikeBrowser(case1.body).join('\n');
console.log(actual1);
if (case1.stoppedAt) {
  console.log(`(stopped at token #${case1.stoppedAt.idx}: ${case1.stoppedAt.token.type} — expected, this engine doesn't implement EOF handling)`);
}
assert.equal(actual1, EXPECTED_TREE_1, 'engine output must match real browser DOMParser output exactly');

// ── Case 2: real DOMParser output for
// '<!DOCTYPE html><head></head><body><table><td><table><tr>FOO</table></table></body>':
const EXPECTED_TREE_2 = [
  'body',
  '  table',
  '    tbody',
  '      tr',
  '        td',
  '          #text "FOO"',
  '          table',
  '            tbody',
  '              tr',
].join('\n');

console.log('\n── Case 2: <table><td><table><tr>FOO</table></table> (nested table) ──');
const case2 = runToCompletion('<!DOCTYPE html><head></head><body><table><td><table><tr>FOO</table></table></body>');
const actual2 = serializeLikeBrowser(case2.body).join('\n');
console.log(actual2);
assert.ok(case2.stoppedAt, 'engine must stop at the inner </table> — it does not implement full table-closing logic yet');
assert.equal(case2.stoppedAt.token.type, 'EndTag');
assert.equal(case2.stoppedAt.token.tagName, 'table');
console.log(`(stopped at token #${case2.stoppedAt.idx}: inner </table> — expected; the tree built so far is already complete and correct)`);
assert.equal(actual2, EXPECTED_TREE_2, 'engine output must match real browser DOMParser output exactly, including FOO fostered before the inner table, not inside its <tr>');

console.log('\nOK — all assertions passed. Module 05 adjusted insertion location verified against real browser output.');
