'use strict';

const { dispatch, currentNode, NotImplementedYet, createParserState } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { insertCharacterAtAppropriatePlace, insertElementAtAppropriatePlace } = require('../../05_seven_substeps/src/location.js');
const { inTableSpecificRules } = require('../../05_seven_substeps/src/dispatch5.js');
const { inTableRefusesFostering } = require('../../07_what_refuses/src/nonfoster.js');
const { enterInTableText, handleInTableText } = require('../../08_in_table_text/src/tabletext.js');
const {
  FORMATTING_ELEMENTS,
  pushActiveFormattingElement,
  pushMarker,
  clearActiveFormattingElementsToLastMarker,
  clearStackBackToTableContext,
  reconstructActiveFormattingElements,
} = require('./formatting.js');

// A reconstruction-aware character inserter, passed into Module 08's
// handleInTableText (additively — see that module's DECISIONS.md) so a buffered,
// fostered character run reconstructs formatting elements before each character,
// exactly as "in body"'s character-token rule does in the real spec.
function insertCharWithReconstruction(state, ch) {
  reconstructActiveFormattingElements(state, insertElementAtAppropriatePlace);
  insertCharacterAtAppropriatePlace(state, ch);
}

// <td>/<th>/<tr> now clear the stack back to a table context FIRST (popping a stray
// fostered formatting element like <b>, which stays on the active-formatting LIST —
// this is the divergence the triple-<b> example depends on), then delegate to
// Module 05's original logic unchanged. <td>/<th> additionally push a marker.
function inTableSpecificRules10(token, state) {
  if (token.type !== 'StartTag') return false;
  if (!['td', 'th', 'tr'].includes(token.tagName)) return false;
  clearStackBackToTableContext(state);
  const handled = inTableSpecificRules(token, state);
  if (handled && (token.tagName === 'td' || token.tagName === 'th')) {
    pushMarker(state);
  }
  return handled;
}

// Module 05's inBodyFosterAware, extended with: reconstruction before character
// insertion, a dedicated formatting-element branch (reconstruct, insert, push onto
// the active-formatting list), and marker-clearing on </td>/</th>.
function inBodyFosterAware10(token, state) {
  if (token.type === 'Character') {
    reconstructActiveFormattingElements(state, insertElementAtAppropriatePlace);
    insertCharacterAtAppropriatePlace(state, token.data);
    return;
  }
  if (token.type === 'StartTag' && token.tagName === 'table') {
    insertElementAtAppropriatePlace(state, token.tagName, token.attrs);
    state.mode = 'in table';
    return;
  }
  if (token.type === 'StartTag' && FORMATTING_ELEMENTS.has(token.tagName)) {
    reconstructActiveFormattingElements(state, insertElementAtAppropriatePlace);
    const el = insertElementAtAppropriatePlace(state, token.tagName, token.attrs);
    pushActiveFormattingElement(state, el);
    return;
  }
  if (token.type === 'StartTag') {
    insertElementAtAppropriatePlace(state, token.tagName, token.attrs);
    return;
  }
  if (token.type === 'EndTag' && token.tagName === 'table') {
    // A minimal, targeted "close the table" rule — needed for THIS module's own
    // test case to reach the third <b> (reconstructed after the table closes), and
    // absent from every prior module by deliberate choice (Modules 05/07/08 all
    // stop at exactly this boundary; see their DECISIONS.md). Pops the stack up to
    // and including the nearest <table>, regardless of what else is on top of it
    // (here, a stray reconstructed <b>) — a simplified stand-in for "reset the
    // insertion mode appropriately" that always lands back at "in body" for this
    // engine's test cases. See DECISIONS.md.
    while (state.stack.length > 0) {
      const popped = state.stack.pop();
      if (popped.tagName === 'table') break;
    }
    state.mode = 'in body';
    return;
  }
  if (token.type === 'EndTag') {
    const cur = currentNode(state);
    if (cur && cur.tagName === token.tagName) {
      state.stack.pop();
      if (token.tagName === 'td' || token.tagName === 'th') {
        clearActiveFormattingElementsToLastMarker(state);
      }
      return;
    }
  }
  throw new NotImplementedYet('in body (Module 10, formatting-aware)', token);
}

function dispatch10(token, state, log) {
  if (state.mode === 'in table text') {
    return handleInTableText(token, state, log, dispatch10, insertCharWithReconstruction);
  }
  if (state.mode === 'in table' && token.type === 'Character') {
    enterInTableText(state);
    return dispatch10(token, state, log);
  }
  if (state.mode === 'in table') {
    if (inTableRefusesFostering(token, state)) return;
    if (inTableSpecificRules10(token, state)) return;
    log('enable');
    state.fosterParentingEnabled = true;
    try {
      inBodyFosterAware10(token, state);
    } finally {
      log('disable');
      state.fosterParentingEnabled = false;
    }
    return;
  }
  if (state.mode === 'in body') {
    return inBodyFosterAware10(token, state);
  }
  return dispatch(token, state);
}

function createParserState10() {
  const state = createParserState();
  state.activeFormattingElements = [];
  return state;
}

module.exports = { dispatch10, createParserState10 };
