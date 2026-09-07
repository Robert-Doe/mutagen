'use strict';

const assert = require('node:assert/strict');
const { tokenize } = require('../../01_stack_and_dispatch/src/tokenizer.js');
const { createParserState, NotImplementedYet } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { ElementNode, TextNode, CommentNode } = require('../../00_tokens_and_nodes/src/nodes.js');
const { dispatch8 } = require('../src/dispatch8.js');

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
      dispatch8(token, state, () => {});
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
  console.log(JSON.stringify(html));
  const body = runToCompletion(html);
  const actual = serializeLikeBrowser(body).join('\n');
  console.log(actual + '\n');
  assert.equal(actual, expectedLines.join('\n'), `${label}: engine output must match real browser DOMParser output`);
}

check(
  'The whitespace trap: one non-space character drags the whole buffered run out with it',
  '<!DOCTYPE html><head></head><body><table><tr><td>a</td></tr>\n  x</table></body>',
  ['body', '  #text "\\n  x"', '  table', '    tbody', '      tr', '        td', '          #text "a"']
);

check(
  'Whitespace-only run: inserted inside the table, no parse error, no fostering',
  '<!DOCTYPE html><head></head><body><table>\n<tr></table></body>',
  ['body', '  table', '    #text "\\n"', '    tbody', '      tr']
);

check(
  'All-whitespace, no following element: still fuses into one text node inside the table',
  '<!DOCTYPE html><head></head><body><table>   </table></body>',
  ['body', '  table', '    #text "   "']
);

console.log('OK — all assertions passed. Module 08 "in table text" whitespace trap verified against real browser output.');
