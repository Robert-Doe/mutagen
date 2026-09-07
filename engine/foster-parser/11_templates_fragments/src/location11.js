'use strict';

const { isFosterParentingTarget } = require('../../02_two_conditions_one_gate/src/foster.js');
const { insertNode, tryFuseCharacter, TextNode, ElementNode } = require('../../00_tokens_and_nodes/src/nodes.js');

// Module 05's getAdjustedInsertionLocation, completed: substep 1 (the last-template
// check) and the outer algorithm's own step 3 (redirect into template contents),
// both deliberately deferred since Module 05 because this engine had no
// DocumentFragment node kind until now. See DECISIONS.md.
function getAdjustedInsertionLocation11(state) {
  const target = state.stack[state.stack.length - 1];

  if (!isFosterParentingTarget(state)) {
    // Ordinary case (step 3 of the ordinary branch) — still subject to the outer
    // "redirect into template contents" rule if target itself is a <template>.
    return redirectIfTemplate({ parent: target, index: target.children.length });
  }

  // Foster-parenting substeps, now complete (2 through 7):
  const stack = state.stack;
  let lastTemplateIndex = -1;
  let lastTableIndex = -1;
  for (let i = stack.length - 1; i >= 0; i--) {
    if (lastTemplateIndex === -1 && stack[i].tagName === 'template') lastTemplateIndex = i;
    if (lastTableIndex === -1 && stack[i].tagName === 'table') lastTableIndex = i;
    if (lastTemplateIndex !== -1 && lastTableIndex !== -1) break;
  }

  // Substep 1 + 3: a template exists, and it's more deeply nested (pushed more
  // recently) than the last table, or there's no table at all — redirect straight
  // into that template's contents, skipping the table-relative computation entirely.
  if (lastTemplateIndex !== -1 && (lastTableIndex === -1 || lastTemplateIndex > lastTableIndex)) {
    const templateEl = stack[lastTemplateIndex];
    return { parent: templateEl.content, index: templateEl.content.children.length };
  }

  // Substep 4 — FRAGMENT CASE: no table anywhere on the stack (and no qualifying
  // template either, per the check above).
  if (lastTableIndex === -1) {
    const first = stack[0];
    return redirectIfTemplate({ parent: first, index: first.children.length });
  }

  const lastTable = stack[lastTableIndex];

  // Substep 5 — THE NORMAL CASE.
  if (lastTable.parent) {
    const parent = lastTable.parent;
    return redirectIfTemplate({ parent, index: parent.children.indexOf(lastTable) });
  }

  // Substeps 6-7 — detached table (not browser-verifiable; see Module 05's
  // DECISIONS.md, unchanged reasoning here).
  const previousElement = stack[lastTableIndex - 1];
  return redirectIfTemplate({ parent: previousElement, index: previousElement.children.length });
}

// The outer algorithm's own step 3: if the computed location's parent is itself a
// <template> element, redirect into its .content fragment instead.
function redirectIfTemplate(location) {
  if (location.parent instanceof ElementNode && location.parent.tagName === 'template') {
    const content = location.parent.content;
    return { parent: content, index: content.children.length };
  }
  return location;
}

function insertCharacterAtAppropriatePlace11(state, data) {
  const { parent, index } = getAdjustedInsertionLocation11(state);
  if (!tryFuseCharacter(parent, data, index)) {
    insertNode(parent, new TextNode(data), index);
  }
}

function insertElementAtAppropriatePlace11(state, tagName, attrs = new Map()) {
  const { parent, index } = getAdjustedInsertionLocation11(state);
  const el = new ElementNode(tagName);
  for (const [k, v] of attrs) el.attrs.set(k, v);
  insertNode(parent, el, index);
  state.stack.push(el);
  return el;
}

module.exports = {
  getAdjustedInsertionLocation11,
  insertCharacterAtAppropriatePlace11,
  insertElementAtAppropriatePlace11,
  redirectIfTemplate,
};
