'use strict';

const assert = require('node:assert/strict');
const { tokenize } = require('../src/tokenizer.js');
const { createParserState, dispatch, currentNode, NotImplementedYet } = require('../src/dispatch.js');
const { renderTree } = require('../../00_tokens_and_nodes/src/nodes.js');

const html = '<!DOCTYPE html><html><head></head><body>hi<table></table></body></html>';

const tokens = tokenize(html);
console.log(`── Tokenized "${html}" into ${tokens.length} tokens ──`);

const state = createParserState();
let stoppedAt = null;

for (const [idx, token] of tokens.entries()) {
  try {
    dispatch(token, state);
  } catch (err) {
    if (err instanceof NotImplementedYet) {
      stoppedAt = { idx, token, err };
      break;
    }
    throw err;
  }
}

console.log('\n── Parser state the moment "in table" was first reached ──');
console.log('mode:', state.mode);
console.log('current node:', currentNode(state).tagName);
console.log('stack (bottom → top):', state.stack.map((el) => el.tagName).join(' > '));

console.log('\n── Document tree built so far ──');
console.log(renderTree(state.document).join('\n'));

assert.equal(state.mode, 'in table', 'dispatch loop must have switched into "in table" mode');
assert.equal(currentNode(state).tagName, 'table', 'current node must be the <table> element itself');
assert.deepEqual(
  state.stack.map((el) => el.tagName),
  ['html', 'body', 'table'],
  'stack should be exactly html > body > table when "in table" is first reached'
);
assert.ok(stoppedAt, 'the loop must stop via NotImplementedYet, not silently run to completion');
assert.equal(stoppedAt.token.type, 'EndTag', 'the token that triggers the stop should be the </table> end tag');
assert.equal(stoppedAt.token.tagName, 'table');

console.log(`\n── Stopped as expected on token #${stoppedAt.idx} (${stoppedAt.token.type} ${stoppedAt.token.tagName}) ──`);
console.log(stoppedAt.err.message);

console.log('\nOK — all assertions passed. Module 01 dispatch loop verified.');
