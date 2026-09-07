'use strict';

const assert = require('node:assert/strict');
const { tokenize } = require('../../01_stack_and_dispatch/src/tokenizer.js');
const {
  createParserState,
  dispatch,
  currentNode,
  NotImplementedYet,
} = require('../../01_stack_and_dispatch/src/dispatch.js');
const { characterToken, tokenToString } = require('../../00_tokens_and_nodes/src/tokens.js');
const { dispatchWithFosterParenting } = require('../src/lifecycle.js');

// ── Setup: reach "in table" for real, via Module 01's own unmodified engine ──
const html = '<!DOCTYPE html><html><head></head><body><table></table></body></html>';
const tokens = tokenize(html);
const state = createParserState();
let i = 0;
for (; i < tokens.length; i++) {
  try {
    dispatch(tokens[i], state);
  } catch (err) {
    if (err instanceof NotImplementedYet) break; // stopped right at "in table", token i not yet processed
    throw err;
  }
}
console.log(`── Reached mode "${state.mode}" (current node <${currentNode(state).tagName}>) at token #${i}: ${tokenToString(tokens[i])} ──`);
assert.equal(state.mode, 'in table');
assert.equal(
  state.fosterParentingEnabled,
  undefined,
  'the flag must not exist/be set before any in-table fallback has ever run'
);

// ── Scenario A: the fallback token hits an in-body case that isn't implemented
// either (</table>'s end tag). Proves "then disable" fires even when the wrapped
// call throws — the flag's lifetime must not depend on that call succeeding. ──
console.log('\n── Scenario A: fallback token that in body ALSO can\'t handle ──');
const logA = [];
let caughtA = null;
try {
  dispatchWithFosterParenting(tokens[i], state, (event) => logA.push(event));
} catch (err) {
  if (err instanceof NotImplementedYet) caughtA = err;
  else throw err;
}
console.log('log:', logA.join(' → '));
console.log('flag after:', state.fosterParentingEnabled);
console.log('mode after:', state.mode, '(must still be "in table" — in body\'s rules never touched it)');

assert.deepEqual(logA, ['enable', 'disable'], 'enable then disable must bracket the attempt, even on failure');
assert.equal(state.fosterParentingEnabled, false, 'flag must be disabled again immediately, even though the wrapped call threw');
assert.ok(caughtA instanceof NotImplementedYet, 'the underlying error must still propagate — disabling the flag must not swallow it');
assert.equal(state.mode, 'in table', 'mode must be unchanged: in body\'s rules for this token never issued a mode switch');

// ── Scenario B: a fallback token that in body CAN handle (whitespace character).
// Proves the flag brackets a successful attempt identically, and that "process
// using the rules for in body" does NOT itself switch state.mode away from
// "in table" — only an explicit in-body rule (like the <table> one) would. ──
console.log('\n── Scenario B: fallback token that in body CAN handle ──');
const spaceToken = characterToken(' ');
const logB = [];
dispatchWithFosterParenting(spaceToken, state, (event) => logB.push(event));
console.log('log:', logB.join(' → '));
console.log('flag after:', state.fosterParentingEnabled);
console.log('mode after:', state.mode, '(must still be "in table")');

assert.deepEqual(logB, ['enable', 'disable'], 'enable then disable must bracket the attempt on the success path too');
assert.equal(state.fosterParentingEnabled, false, 'flag must be disabled again immediately after a successful attempt');
assert.equal(state.mode, 'in table', 'mode must still be "in table" — inserting a character never switches modes');

console.log('\nOK — all assertions passed. Module 03 flag lifetime verified.');
