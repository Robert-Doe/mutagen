'use strict';

const { dispatch, currentNode, NotImplementedYet, createParserState } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { ElementNode, DocumentFragmentNode, insertNode } = require('../../00_tokens_and_nodes/src/nodes.js');
const { inTableRefusesFostering } = require('../../07_what_refuses/src/nonfoster.js');
const { enterInTableText, handleInTableText } = require('../../08_in_table_text/src/tabletext.js');
const {
  FORMATTING_ELEMENTS,
  pushActiveFormattingElement,
  pushMarker,
  clearActiveFormattingElementsToLastMarker,
  clearStackBackToTableContext,
  reconstructActiveFormattingElements,
} = require('../../10_formatting_triple_b/src/formatting.js');
const {
  insertCharacterAtAppropriatePlace11,
  insertElementAtAppropriatePlace11,
} = require('../../11_templates_fragments/src/location11.js');
const { mergeHtmlAttributes } = require('../../12_containment_atlas/src/merge.js');
const { hasInScope } = require('../../13_scope/src/scope.js');
const { runAdoptionAgency } = require('./adoption_agency.js');

// A LOCAL, extended set — {'b', 'i'} — built by spreading Module 10's original
// FORMATTING_ELEMENTS into a NEW Set rather than mutating it in place. Module 10's
// Set is a shared, already-verified object imported by every module since; adding
// 'i' to it directly would silently change behavior for every one of them. This
// module needs 'i' recognized too (Case 1's whole point is showing what happens
// when TWO different formatting elements interact), so it builds its own superset
// and its own dispatch chain around it — the same escalation pattern every module
// since 05 has used whenever it needed different insertion behavior than the one
// before it. See DECISIONS.md.
const FORMATTING_ELEMENTS_14 = new Set([...FORMATTING_ELEMENTS, 'i']);

const TABLE_BODY_TAGS = ['tbody', 'thead', 'tfoot'];

function insertTemplateElement(state, attrs = new Map()) {
  const parent = state.stack[state.stack.length - 1];
  const el = new ElementNode('template');
  for (const [k, v] of attrs) el.attrs.set(k, v);
  el.content = new DocumentFragmentNode();
  insertNode(parent, el);
  state.stack.push(el);
  return el;
}

function insertCharWithReconstruction14(state, ch) {
  reconstructActiveFormattingElements(state, insertElementAtAppropriatePlace11);
  insertCharacterAtAppropriatePlace11(state, ch);
}

function inTableSpecificRules14(token, state) {
  if (token.type !== 'StartTag') return false;
  if (token.tagName === 'td' || token.tagName === 'th') {
    clearStackBackToTableContext(state);
    const cur = state.stack[state.stack.length - 1];
    if (!cur || cur.tagName !== 'tr') {
      if (!cur || !TABLE_BODY_TAGS.includes(cur.tagName)) {
        insertElementAtAppropriatePlace11(state, 'tbody');
      }
      insertElementAtAppropriatePlace11(state, 'tr');
    }
    insertElementAtAppropriatePlace11(state, token.tagName, token.attrs);
    pushMarker(state);
    return true;
  }
  if (token.tagName === 'tr') {
    clearStackBackToTableContext(state);
    const cur = state.stack[state.stack.length - 1];
    if (!cur || !TABLE_BODY_TAGS.includes(cur.tagName)) {
      insertElementAtAppropriatePlace11(state, 'tbody');
    }
    insertElementAtAppropriatePlace11(state, token.tagName, token.attrs);
    return true;
  }
  return false;
}

// Module 13's inBodyFosterAware, with exactly two changes: (1) the StartTag
// formatting-element branch checks the LOCAL, extended set, so <i> gets tracked
// too; (2) an EndTag matching that extended set is routed to the adoption agency
// algorithm FIRST, before the generic scope-checked pop. Everything else —
// characters, <table>, generic elements, </table>, generic end tags — is identical
// to Module 13's version, on purpose: this module only ever needed to change how
// formatting-element tags are handled, nothing about tables or scope changed.
function inBodyFosterAware14(token, state, log) {
  if (token.type === 'StartTag' && token.tagName === 'html') {
    mergeHtmlAttributes(state, token);
    return;
  }
  if (token.type === 'Character') {
    reconstructActiveFormattingElements(state, insertElementAtAppropriatePlace11);
    insertCharacterAtAppropriatePlace11(state, token.data);
    return;
  }
  if (token.type === 'StartTag' && token.tagName === 'table') {
    insertElementAtAppropriatePlace11(state, token.tagName, token.attrs);
    state.mode = 'in table';
    return;
  }
  if (token.type === 'StartTag' && FORMATTING_ELEMENTS_14.has(token.tagName)) {
    reconstructActiveFormattingElements(state, insertElementAtAppropriatePlace11);
    const el = insertElementAtAppropriatePlace11(state, token.tagName, token.attrs);
    pushActiveFormattingElement(state, el);
    return;
  }
  if (token.type === 'StartTag') {
    insertElementAtAppropriatePlace11(state, token.tagName, token.attrs);
    return;
  }
  if (token.type === 'EndTag' && FORMATTING_ELEMENTS_14.has(token.tagName)) {
    runAdoptionAgency(state, token.tagName, log);
    return;
  }
  if (token.type === 'EndTag' && token.tagName === 'table') {
    while (state.stack.length > 0) {
      const popped = state.stack.pop();
      if (popped.tagName === 'table') break;
    }
    state.mode = 'in body';
    return;
  }
  if (token.type === 'EndTag') {
    if (!hasInScope(state, token.tagName)) {
      return;
    }
    const cur = currentNode(state);
    if (cur && cur.tagName === token.tagName) {
      state.stack.pop();
      if (token.tagName === 'td' || token.tagName === 'th') {
        clearActiveFormattingElementsToLastMarker(state);
      }
      return;
    }
  }
  throw new NotImplementedYet('in body (Module 14, adoption-agency-aware)', token);
}

function dispatch14(token, state, log = () => {}) {
  if (token.type === 'StartTag' && token.tagName === 'template') {
    insertTemplateElement(state, token.attrs);
    return;
  }
  if (state.mode === 'in table text') {
    return handleInTableText(token, state, log, dispatch14, insertCharWithReconstruction14);
  }
  if (state.mode === 'in table' && token.type === 'Character') {
    enterInTableText(state);
    return dispatch14(token, state, log);
  }
  if (state.mode === 'in table') {
    if (inTableRefusesFostering(token, state)) return;
    if (inTableSpecificRules14(token, state)) return;
    state.fosterParentingEnabled = true;
    try {
      inBodyFosterAware14(token, state, log);
    } finally {
      state.fosterParentingEnabled = false;
    }
    return;
  }
  if (state.mode === 'in body') {
    return inBodyFosterAware14(token, state, log);
  }
  return dispatch(token, state);
}

function createParserState14() {
  const state = createParserState();
  state.activeFormattingElements = [];
  return state;
}

module.exports = { dispatch14, createParserState14, FORMATTING_ELEMENTS_14 };
