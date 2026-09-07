'use strict';

const assert = require('node:assert/strict');
const { tokenize } = require('../../01_stack_and_dispatch/src/tokenizer.js');
const { NotImplementedYet } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { ElementNode, TextNode, CommentNode } = require('../../00_tokens_and_nodes/src/nodes.js');
const { dispatch13, createParserState13 } = require('../src/dispatch13.js');
const { hasInScope, hasInListItemScope, hasInButtonScope, hasInTableScope } = require('../src/scope.js');

function serializeLikeBrowser(node, depth = 0, out = []) {
  const indent = '  '.repeat(depth);
  if (node instanceof ElementNode) out.push(indent + node.tagName);
  else if (node instanceof TextNode) out.push(indent + '#text ' + JSON.stringify(node.data));
  else if (node instanceof CommentNode) out.push(indent + '#comment ' + JSON.stringify(node.data));
  for (const child of node.children || []) serializeLikeBrowser(child, depth + 1, out);
  return out;
}

// ── Part 1: "table is a wall," end to end, through the full engine ──
console.log('── Part 1: a stray </div> inside a <td> can never close the outer <div> ──\n');

const html = '<!DOCTYPE html><head></head><body><div id="outer"><table><tr><td></div></td></tr></table></div></body>';
console.log(html, '\n');

const tokens = tokenize(html);
const state = createParserState13();
let stoppedAt = null;
for (const [idx, token] of tokens.entries()) {
  try {
    dispatch13(token, state, () => {});
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
console.log(actual);
if (stoppedAt) console.log(`(stopped at token #${stoppedAt.idx}: ${stoppedAt.token.type} ${stoppedAt.token.tagName ?? ''})`);

const EXPECTED = ['body', '  div', '    table', '      tbody', '        tr', '          td'].join('\n');
assert.equal(actual, EXPECTED, 'the stray </div> must be silently ignored; the outer div must still close normally at the real </div>');
console.log('\nOK: the inner </div> was silently ignored (parse error, no effect); the outer <div> still has exactly');
console.log('one child (the table) — no stray text, no premature close.\n');

// ── Part 2: the four scope variants, contrasted directly ──
console.log('── Part 2: the four scope variants disagree on purpose ──\n');

function stackOf(...tagNames) {
  return { stack: tagNames.map((t) => new ElementNode(t)) };
}

const listStack = stackOf('html', 'body', 'div', 'ol', 'li');
const r1a = hasInScope(listStack, 'div');
const r1b = hasInListItemScope(listStack, 'div');
console.log(`Stack: html > body > div > ol > li — hasInScope('div') = ${r1a}, hasInListItemScope('div') = ${r1b}`);
assert.equal(r1a, true, 'base scope does not stop at <ol>/<li> — div must be reachable');
assert.equal(r1b, false, 'list-item scope DOES stop at <ol> — div must be unreachable');

const buttonStack = stackOf('html', 'body', 'div', 'button');
const r2a = hasInScope(buttonStack, 'div');
const r2b = hasInButtonScope(buttonStack, 'div');
console.log(`Stack: html > body > div > button — hasInScope('div') = ${r2a}, hasInButtonScope('div') = ${r2b}`);
assert.equal(r2a, true, 'base scope does not stop at <button> — div must be reachable');
assert.equal(r2b, false, 'button scope DOES stop at <button> — div must be unreachable');

const tableStack = stackOf('html', 'body', 'div', 'table', 'tbody', 'tr', 'td');
const r3a = hasInScope(tableStack, 'div');
console.log(`Stack: html > body > div > table > tbody > tr > td — hasInScope('div') = ${r3a}`);
assert.equal(r3a, false, 'base scope DOES stop at <td> — this is "table is a wall," proven directly, not just observed in Part 1');

const r4 = hasInTableScope(stackOf('html', 'body', 'table'), 'table');
console.log(`Stack: html > body > table — hasInTableScope('table') = ${r4}`);
assert.equal(r4, true, 'table scope finds table immediately when it IS the current node');

console.log('\nOK — all assertions passed. Module 13 scope verified, both end-to-end and variant-by-variant.');
