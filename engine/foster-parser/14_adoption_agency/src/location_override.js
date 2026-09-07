'use strict';

const { FOSTER_PARENT_TARGETS } = require('../../02_two_conditions_one_gate/src/foster.js');
const { redirectIfTemplate } = require('../../11_templates_fragments/src/location11.js');
const { insertNode } = require('../../00_tokens_and_nodes/src/nodes.js');

// "Appropriate place for inserting a node," completed for real this time: step 1's
// full generality. Every module through 13 only ever needed the default ("target =
// current node") — the override-target branch existed in the prose since
// Prerequisite P5 but nothing in this engine ever supplied one, because nothing
// needed to insert somewhere OTHER than wherever the parser currently stood. The
// adoption agency algorithm is the one caller in the whole spec that does.
//
// This file was rewritten TWICE during this module's build. First it looked like
// this (correctly). Then, reading the current spec prose too literally ("let
// insertionLocation be commonAncestor, after its last child... insert... at the
// adjusted insertion location given insertionLocation"), it was "simplified" to
// skip the foster-parenting gate entirely. That reading turned out to be wrong:
// checked against parse5's actual, battle-tested source
// (`aaInsertLastNodeInCommonAncestor`), which explicitly tests
// `_isElementCausesFosterParenting(commonAncestor)` before deciding whether to
// foster-parent or ordinary-append — confirming the gate DOES apply here. Restored
// to this fuller form. See DECISIONS.md for the full corrective narrative,
// including the exact source quoted.
function isFosterParentingTargetFor(state, target) {
  return Boolean(state.fosterParentingEnabled) && Boolean(target) && FOSTER_PARENT_TARGETS.has(target.tagName);
}

function getAdjustedInsertionLocationFor(state, target) {
  if (!isFosterParentingTargetFor(state, target)) {
    return redirectIfTemplate({ parent: target, index: target.children.length });
  }

  // The foster-parenting substeps never actually depend on WHICH element failed
  // the gate — only on the stack's contents (last table / last template). Same
  // scan as location11.js.
  const stack = state.stack;
  let lastTemplateIndex = -1;
  let lastTableIndex = -1;
  for (let i = stack.length - 1; i >= 0; i--) {
    if (lastTemplateIndex === -1 && stack[i].tagName === 'template') lastTemplateIndex = i;
    if (lastTableIndex === -1 && stack[i].tagName === 'table') lastTableIndex = i;
    if (lastTemplateIndex !== -1 && lastTableIndex !== -1) break;
  }

  if (lastTemplateIndex !== -1 && (lastTableIndex === -1 || lastTemplateIndex > lastTableIndex)) {
    const templateEl = stack[lastTemplateIndex];
    return { parent: templateEl.content, index: templateEl.content.children.length };
  }

  if (lastTableIndex === -1) {
    const first = stack[0];
    return redirectIfTemplate({ parent: first, index: first.children.length });
  }

  const lastTable = stack[lastTableIndex];
  if (lastTable.parent) {
    const parent = lastTable.parent;
    return redirectIfTemplate({ parent, index: parent.children.indexOf(lastTable) });
  }

  const previousElement = stack[lastTableIndex - 1];
  return redirectIfTemplate({ parent: previousElement, index: previousElement.children.length });
}

// Moves `node` (an already-constructed, already-parented element — the adoption
// agency algorithm relocates nodes that already exist) to the location `target`
// computes, detaching it from its current parent first.
function insertNodeAtAppropriatePlaceFor(state, node, target) {
  const { parent, index } = getAdjustedInsertionLocationFor(state, target);
  if (node.parent) {
    const oldSiblings = node.parent.children;
    const oldIndex = oldSiblings.indexOf(node);
    if (oldIndex !== -1) oldSiblings.splice(oldIndex, 1);
  }
  insertNode(parent, node, index);
  return node;
}

module.exports = {
  getAdjustedInsertionLocationFor,
  insertNodeAtAppropriatePlaceFor,
};
