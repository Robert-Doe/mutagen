'use strict';

const assert = require('node:assert/strict');
const { tokenize } = require('../../01_stack_and_dispatch/src/tokenizer.js');
const { createParserState, NotImplementedYet } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { ElementNode, TextNode, CommentNode } = require('../../00_tokens_and_nodes/src/nodes.js');
const { dispatch7 } = require('../src/dispatch7.js');
const { inTableRefusesFostering } = require('../src/nonfoster.js');
const { doctypeToken } = require('../../00_tokens_and_nodes/src/tokens.js');

function serializeLikeBrowser(node, depth = 0, out = []) {
  const indent = '  '.repeat(depth);
  if (node instanceof ElementNode) out.push(indent + node.tagName);
  else if (node instanceof TextNode) out.push(indent + '#text ' + JSON.stringify(node.data));
  else if (node instanceof CommentNode) out.push(indent + '#comment ' + JSON.stringify(node.data));
  for (const child of node.children || []) serializeLikeBrowser(child, depth + 1, out);
  return out;
}

function runToCompletion(html) {
  const tokens = tokenize(html);
  const state = createParserState();
  for (const token of tokens) {
    try {
      dispatch7(token, state, () => {});
    } catch (err) {
      if (err instanceof NotImplementedYet) break;
      throw err;
    }
  }
  const html_ = state.document.children.find((c) => c.tagName === 'html');
  const body = html_.children.find((c) => c.tagName === 'body');
  return body;
}

function check(label, html, expectedLines) {
  console.log(`── ${label} ──`);
  console.log(html);
  const body = runToCompletion(html);
  const actual = serializeLikeBrowser(body).join('\n');
  console.log(actual + '\n');
  assert.equal(actual, expectedLines.join('\n'), `${label}: engine output must match real browser DOMParser output`);
}

check(
  '<style> stays inside the table',
  '<!DOCTYPE html><head></head><body><table><style>p{}</style></table></body>',
  ['body', '  table', '    style', '      #text "p{}"']
);

check(
  '<input type=hidden> stays inside; content AFTER it is still fostered (proves the pop happened)',
  '<!DOCTYPE html><head></head><body><table><input type=hidden>x</table></body>',
  ['body', '  #text "x"', '  table', '    input']
);

check(
  '<input type=text> (not hidden) IS fostered',
  '<!DOCTYPE html><head></head><body><table><input type=text></table></body>',
  ['body', '  input', '  table']
);

check(
  'The childless-form bug: <form> ends up empty inside the table; its own <input> is fostered OUTSIDE it',
  '<!DOCTYPE html><head></head><body><table><form><input name=x></form></table></body>',
  ['body', '  input', '  table', '    form']
);

check(
  'A comment stays inside the table',
  '<!DOCTYPE html><head></head><body><table><!--hi--></table></body>',
  ['body', '  table', '    #comment "hi"']
);

// DOCTYPE mid-table: parse error, ignored — checked directly against
// inTableRefusesFostering rather than through the full tokenizer, since a DOCTYPE
// appearing mid-document is a rare, deliberately synthetic case.
console.log('── A DOCTYPE token mid-table: parse error, ignored, table stays childless ──');
const state = createParserState();
const table = new ElementNode('table');
state.stack = [table];
const handled = inTableRefusesFostering(doctypeToken('html'), state);
assert.equal(handled, true, 'a DOCTYPE token must be reported as handled (i.e. swallowed), not fall through to fostering');
assert.equal(table.children.length, 0, 'nothing should be inserted for a DOCTYPE token encountered mid-table');
console.log('handled:', handled, '| table.children.length:', table.children.length, '\n');

console.log('OK — all assertions passed. Module 07 "what refuses to be fostered" verified against real browser output.');
