'use strict';

const assert = require('node:assert/strict');
const { tokenize } = require('../../01_stack_and_dispatch/src/tokenizer.js');
const {
  createParserState,
  dispatch,
  currentNode,
  NotImplementedYet,
} = require('../../01_stack_and_dispatch/src/dispatch.js');
const { ElementNode } = require('../../00_tokens_and_nodes/src/nodes.js');
const { FOSTER_PARENT_TARGETS, isFosterParentingTarget } = require('../src/foster.js');

// Ground this module in Module 01's real engine, not a synthetic mock: run a real
// parse up to the exact point it stops (current node = table, "in table" mode).
const html = '<!DOCTYPE html><html><head></head><body><table></table></body></html>';
const tokens = tokenize(html);
const state = createParserState();
for (const token of tokens) {
  try {
    dispatch(token, state);
  } catch (err) {
    if (err instanceof NotImplementedYet) break;
    throw err;
  }
}

console.log('── Real Module 01 engine state reached ──');
console.log('current node:', currentNode(state).tagName, '| mode:', state.mode);

// state.fosterParentingEnabled does not exist anywhere in Module 01 — Module 02
// introduces it as a plain field any module can read or set directly. It has no
// lifecycle yet (Module 03 gives it one); here we set it by hand per scenario.
console.log('\n── Truth table: isFosterParentingTarget(flag, currentNode) ──');

const scenarios = [
  { label: 'flag OFF, current node is <table>', flag: false, tag: 'table' },
  { label: 'flag ON,  current node is <table>', flag: true, tag: 'table' },
  { label: 'flag OFF, current node is <td>', flag: false, tag: 'td' },
  { label: 'flag ON,  current node is <td>', flag: true, tag: 'td' },
];

const results = [];
for (const s of scenarios) {
  state.fosterParentingEnabled = s.flag;
  state.stack[state.stack.length - 1] = new ElementNode(s.tag); // swap current node only
  const result = isFosterParentingTarget(state);
  results.push(result);
  console.log(`${s.label.padEnd(34)} → ${result}`);
}

assert.deepEqual(
  results,
  [false, true, false, false],
  'only "flag ON + current node is table-family" may gate true — every other combination must be false'
);

// Edge case: an empty stack (no current node at all — the shape a fragment-parsing
// context will have, previewed for Module 11) must not throw and must return false.
state.fosterParentingEnabled = true;
state.stack.length = 0;
const emptyStackResult = isFosterParentingTarget(state);
assert.equal(emptyStackResult, false, 'an empty stack (no current node) must never satisfy the gate');
console.log(`\nEmpty-stack edge case (flag ON, no current node) → ${emptyStackResult} (no throw)`);

assert.deepEqual(
  [...FOSTER_PARENT_TARGETS].sort(),
  ['table', 'tbody', 'tfoot', 'thead', 'tr'],
  'the five-element set must be exactly table/tbody/tfoot/thead/tr'
);

console.log('\nOK — all assertions passed. Module 02 two-condition gate verified.');
