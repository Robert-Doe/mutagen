'use strict';

const { currentNode } = require('../../01_stack_and_dispatch/src/dispatch.js');

// The real spec recognizes about a dozen "formatting elements" (a, b, big, code, em,
// font, i, nobr, s, small, strike, strong, tt, u). This engine's test cases only
// ever need <b> — see DECISIONS.md for why the set is left this narrow rather than
// populated speculatively.
const FORMATTING_ELEMENTS = new Set(['b']);

// A unique sentinel, not a string or plain object literal, so it can never be
// confused with a real element node when the list is inspected.
const MARKER = Symbol('marker');

// "Push onto the list of active formatting elements." The real spec's Noah's Ark
// clause (remove the earliest of 3+ matching entries since the last marker) is NOT
// implemented — no test case here ever pushes the same formatting element three
// times without an intervening marker. See DECISIONS.md.
function pushActiveFormattingElement(state, element) {
  state.activeFormattingElements.push(element);
}

function pushMarker(state) {
  state.activeFormattingElements.push(MARKER);
}

// "Clear the list of active formatting elements up to the last marker."
function clearActiveFormattingElementsToLastMarker(state) {
  const list = state.activeFormattingElements;
  while (list.length > 0) {
    const entry = list.pop();
    if (entry === MARKER) break;
  }
}

// A merged, simplified stand-in for the spec's three separate "clear the stack back
// to a ___ context" operations (table / table body / table row), which this engine
// does not distinguish since Module 05 collapsed "in table body"/"in row" into "in
// table". Pops anything that ISN'T table-structural, so a stray formatting element
// left on the stack (e.g. a fostered <b>) is correctly popped, while legitimate
// table/tbody/tr current nodes are correctly left alone. See DECISIONS.md.
const TABLE_CONTEXT_STOP_TAGS = new Set(['table', 'tbody', 'thead', 'tfoot', 'tr', 'template', 'html']);

function clearStackBackToTableContext(state) {
  while (state.stack.length > 0 && !TABLE_CONTEXT_STOP_TAGS.has(currentNode(state).tagName)) {
    state.stack.pop();
  }
}

// "Reconstruct the active formatting elements." `insertElementFn` is passed in
// (Module 05's insertElementAtAppropriatePlace) rather than required directly, to
// keep this file decoupled from exactly which insertion function is in use.
function reconstructActiveFormattingElements(state, insertElementFn) {
  const list = state.activeFormattingElements;
  if (list.length === 0) return; // step 1: nothing to do

  const last = list[list.length - 1];
  if (last === MARKER || state.stack.includes(last)) return; // step 2: already satisfied

  // Step 3+: walk backward to the earliest entry that needs recreating (stop at a
  // marker, the start of the list, or an entry already on the stack).
  let i = list.length - 1;
  while (i > 0) {
    const candidate = list[i - 1];
    if (candidate === MARKER || state.stack.includes(candidate)) break;
    i -= 1;
  }

  // Walk forward from there, recreating each entry — inserted at the CURRENT
  // appropriate place (so a reconstruction that happens while current node is a
  // fostering target gets fostered itself), and replacing the list entry with the
  // newly created element object.
  for (; i < list.length; i += 1) {
    const entry = list[i];
    const clone = insertElementFn(state, entry.tagName, entry.attrs);
    list[i] = clone;
  }
}

module.exports = {
  FORMATTING_ELEMENTS,
  MARKER,
  pushActiveFormattingElement,
  pushMarker,
  clearActiveFormattingElementsToLastMarker,
  clearStackBackToTableContext,
  reconstructActiveFormattingElements,
};
