'use strict';

const assert = require('node:assert/strict');
const { tokenize } = require('../../01_stack_and_dispatch/src/tokenizer.js');
const { createParserState, NotImplementedYet } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { ElementNode, TextNode, CommentNode } = require('../../00_tokens_and_nodes/src/nodes.js');
const { dispatch5 } = require('../../05_seven_substeps/src/dispatch5.js');
const { insertForeignElementAtAppropriatePlace } = require('../src/foreign.js');
const { insertElementAtAppropriatePlace } = require('../../05_seven_substeps/src/location.js');

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
  let stoppedAt = null;
  for (const [idx, token] of tokens.entries()) {
    try {
      dispatch5(token, state, () => {});
    } catch (err) {
      if (err instanceof NotImplementedYet) {
        stoppedAt = { idx, token };
        break;
      }
      throw err;
    }
  }
  const html_ = state.document.children.find((c) => c.tagName === 'html');
  const body = html_.children.find((c) => c.tagName === 'body');
  return { state, body, stoppedAt };
}

console.log('── Structural check: foreign-element insertion IS HTML-element insertion ──');
// Both functions must produce identical output for identical input — proving "route
// through the same relocation path" isn't just an accidental output match, it's the
// same code. (They aren't literally the same function reference — see DECISIONS.md
// for why a thin alias, not a re-export, is the honest way to state this.)
const probeA = { fosterParentingEnabled: true, stack: [new ElementNode('table')], document: new ElementNode('#root') };
probeA.stack[0].parent = probeA.document;
probeA.document.children = [probeA.stack[0]];
const probeB = { fosterParentingEnabled: true, stack: [new ElementNode('table')], document: new ElementNode('#root') };
probeB.stack[0].parent = probeB.document;
probeB.document.children = [probeB.stack[0]];

const htmlResult = insertElementAtAppropriatePlace(probeA, 'div');
const foreignResult = insertForeignElementAtAppropriatePlace(probeB, 'math');
assert.equal(
  serializeLikeBrowser(probeA.document).join('\n'),
  serializeLikeBrowser(probeB.document).join('\n').replace('math', 'div'),
  'inserting a foreign element must land in exactly the same relative position as an ordinary HTML element would'
);
console.log('OK: identical relocation for an HTML element and a foreign element given the same table-family current node.\n');

// ── Real cases, run through the full dispatch5 engine, unmodified since Module 05 ──
console.log('── Case A: <table><math></math></table> ──');
const caseA = runToCompletion('<!DOCTYPE html><head></head><body><table><math></math></table></body>');
const actualA = serializeLikeBrowser(caseA.body).join('\n');
console.log(actualA);
assert.equal(actualA, ['body', '  math', '  table'].join('\n'));

console.log('\n── Case B: <table><svg></svg></table> ──');
const caseB = runToCompletion('<!DOCTYPE html><head></head><body><table><svg></svg></table></body>');
const actualB = serializeLikeBrowser(caseB.body).join('\n');
console.log(actualB);
assert.equal(actualB, ['body', '  svg', '  table'].join('\n'));

console.log('\n── Case C: mixed HTML element + foreign elements + character, source order ──');
const caseC = runToCompletion('<!DOCTYPE html><head></head><body><table><div></div><math></math>x<svg></svg></table></body>');
const actualC = serializeLikeBrowser(caseC.body).join('\n');
console.log(actualC);
const EXPECTED_C = ['body', '  div', '  math', '  #text "x"', '  svg', '  table'].join('\n');
assert.equal(actualC, EXPECTED_C, 'an HTML element, two foreign elements, and a character token must all foster into the same relative position, in source order');

console.log('\nOK — all assertions passed. Module 06 "what gets fostered" verified against real browser output.');
