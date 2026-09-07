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
const { hasInScope } = require('./scope.js');

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

function insertCharWithReconstruction13(state, ch) {
  reconstructActiveFormattingElements(state, insertElementAtAppropriatePlace11);
  insertCharacterAtAppropriatePlace11(state, ch);
}

function inTableSpecificRules13(token, state) {
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

// Module 12's inBodyFosterAware, extended with scope: a generic end tag is now
// checked against "has an element in scope" FIRST. Not in scope → ignored (parse
// error, no-op) — this is the mechanism that makes table a wall (Module 04's five
// elements are exactly the base scope list's table-family members). In scope AND
// current node matches exactly → pops, same as every module since 05. In scope but
// current node does NOT match exactly would need "generate implied end tags," which
// this engine still doesn't implement — honestly falls through to NotImplementedYet.
function inBodyFosterAware13(token, state) {
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
  if (token.type === 'StartTag' && FORMATTING_ELEMENTS.has(token.tagName)) {
    reconstructActiveFormattingElements(state, insertElementAtAppropriatePlace11);
    const el = insertElementAtAppropriatePlace11(state, token.tagName, token.attrs);
    pushActiveFormattingElement(state, el);
    return;
  }
  if (token.type === 'StartTag') {
    insertElementAtAppropriatePlace11(state, token.tagName, token.attrs);
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
      return; // parse error — ignore. This is "table is a wall" in one line.
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
  throw new NotImplementedYet('in body (Module 13, scope-aware)', token);
}

function dispatch13(token, state, log) {
  if (token.type === 'StartTag' && token.tagName === 'template') {
    insertTemplateElement(state, token.attrs);
    return;
  }
  if (state.mode === 'in table text') {
    return handleInTableText(token, state, log, dispatch13, insertCharWithReconstruction13);
  }
  if (state.mode === 'in table' && token.type === 'Character') {
    enterInTableText(state);
    return dispatch13(token, state, log);
  }
  if (state.mode === 'in table') {
    if (inTableRefusesFostering(token, state)) return;
    if (inTableSpecificRules13(token, state)) return;
    log('enable');
    state.fosterParentingEnabled = true;
    try {
      inBodyFosterAware13(token, state);
    } finally {
      log('disable');
      state.fosterParentingEnabled = false;
    }
    return;
  }
  if (state.mode === 'in body') {
    return inBodyFosterAware13(token, state);
  }
  return dispatch(token, state);
}

function createParserState13() {
  const state = createParserState();
  state.activeFormattingElements = [];
  return state;
}

module.exports = { dispatch13, createParserState13 };
