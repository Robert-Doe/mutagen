'use strict';

const { tokenize } = require('../../01_stack_and_dispatch/src/tokenizer.js');
const { NotImplementedYet } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { ElementNode, insertNode } = require('../../00_tokens_and_nodes/src/nodes.js');
const { createParserState11 } = require('./dispatch11.js');

// The HTML fragment parsing algorithm, simplified to what this module's test cases
// need. Real spec: create a fresh Document, create a root `html` element, seed the
// stack of open elements with JUST that root (the context element itself is never
// pushed), select an initial insertion mode from the context element's tag name via
// "reset the insertion mode appropriately," then parse normally. What the algorithm
// ultimately returns is root's children — that's what `element.innerHTML = ...`
// installs as the target's new children.
//
// Only `contextTagName === 'table'` is exercised/verified by this module (see
// DECISIONS.md for why 'tbody'/'tr' contexts are NOT — this engine's mode-selection
// doesn't distinguish them from 'table' finely enough to match real browsers exactly
// for those specific contexts).
function parseFragment(html, contextTagName, dispatchFn) {
  const tokens = tokenize(html);
  const state = createParserState11();
  const root = new ElementNode('html');
  insertNode(state.document, root); // a throwaway parent so insertNode's contract is satisfied
  state.stack = [root];
  state.mode = contextTagName === 'table' ? 'in table' : 'in body';

  for (const token of tokens) {
    try {
      dispatchFn(token, state, () => {});
    } catch (err) {
      if (err instanceof NotImplementedYet) break;
      throw err;
    }
  }

  return root.children;
}

module.exports = { parseFragment };
