'use strict';

const { isFosterParentingTarget } = require('../../02_two_conditions_one_gate/src/foster.js');
const { insertNode, tryFuseCharacter, TextNode, ElementNode } = require('../../00_tokens_and_nodes/src/nodes.js');

// "Appropriate place for inserting a node" (Prerequisite P5), in full, for the first
// time: step 1 (target = current node — no override target parameter yet; nothing
// through Module 09 needs one, so it's deferred rather than built speculatively),
// step 2 (the foster-parenting substeps, reusing Module 02's gate unchanged), step 3
// (the ordinary case). Substeps 1 and 3 of the *foster-parenting* substep list — the
// last-template check and its "redirect into template contents" consequence — are
// NOT implemented: this engine has no DocumentFragment/template-contents node kind
// until Module 11. See DECISIONS.md for exactly what a <template> on the stack does
// here instead (nothing special — it's treated as an ordinary element).
function getAdjustedInsertionLocation(state) {
  const target = state.stack[state.stack.length - 1];

  if (!isFosterParentingTarget(state)) {
    // Step 3: the ordinary case. Every module before this one used exactly this
    // rule, hardcoded; from here on, it's the fallback branch of a real algorithm.
    return { parent: target, index: target.children.length };
  }

  // Step 2 fired — run the foster-parenting substeps (spec substeps 2, 4, 5, 6, 7).
  const stack = state.stack;
  let lastTableIndex = -1;
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].tagName === 'table') {
      lastTableIndex = i;
      break;
    }
  }

  // Substep 4 — FRAGMENT CASE: no table anywhere on the stack. Not naturally
  // reachable by this course's engine until Module 11 (fragment parsing); included
  // here so the algorithm is total, not partial. See DECISIONS.md.
  if (lastTableIndex === -1) {
    const first = stack[0];
    return { parent: first, index: first.children.length };
  }

  const lastTable = stack[lastTableIndex];

  // Substep 5 — THE NORMAL CASE: last table has a parent node.
  if (lastTable.parent) {
    const parent = lastTable.parent;
    return { parent, index: parent.children.indexOf(lastTable) };
  }

  // Substeps 6-7 — the table was removed/moved from the tree mid-parse (§13.2.4.2's
  // warning; not reachable by this engine, which only parses static strings — see
  // DECISIONS.md). Falls back to the element immediately above it on the stack.
  const previousElement = stack[lastTableIndex - 1];
  return { parent: previousElement, index: previousElement.children.length };
}

// "Insert a character" and "insert an HTML element," now routed through the real
// algorithm above instead of Module 01's hardcoded "current node, last child."
// When foster parenting isn't in effect, getAdjustedInsertionLocation's step-3
// branch makes these behave identically to Module 01's originals — see DECISIONS.md
// for why that equivalence is exactly what makes it safe to use these unconditionally.
function insertCharacterAtAppropriatePlace(state, data) {
  const { parent, index } = getAdjustedInsertionLocation(state);
  if (!tryFuseCharacter(parent, data, index)) {
    insertNode(parent, new TextNode(data), index);
  }
}

function insertElementAtAppropriatePlace(state, tagName, attrs = new Map()) {
  const { parent, index } = getAdjustedInsertionLocation(state);
  const el = new ElementNode(tagName);
  for (const [k, v] of attrs) el.attrs.set(k, v);
  insertNode(parent, el, index);
  state.stack.push(el);
  return el;
}

module.exports = { getAdjustedInsertionLocation, insertCharacterAtAppropriatePlace, insertElementAtAppropriatePlace };
