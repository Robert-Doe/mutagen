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
} = require('./location11.js');

// <template> is handled uniformly, regardless of mode: never fostered (Module 07
// already established this), and now — new in this module — given a fresh
// DocumentFragmentNode as its .content, which every later insertion targeting this
// element as current node will redirect into (location11.js's redirectIfTemplate).
function insertTemplateElement(state, attrs = new Map()) {
  const parent = state.stack[state.stack.length - 1];
  const el = new ElementNode('template');
  for (const [k, v] of attrs) el.attrs.set(k, v);
  el.content = new DocumentFragmentNode();
  insertNode(parent, el);
  state.stack.push(el);
  return el;
}

function insertCharWithReconstruction11(state, ch) {
  reconstructActiveFormattingElements(state, insertElementAtAppropriatePlace11);
  insertCharacterAtAppropriatePlace11(state, ch);
}

const TABLE_BODY_TAGS = ['tbody', 'thead', 'tfoot'];

// Module 05's inTableSpecificRules, reimplemented rather than reused unchanged —
// necessary here because Module 05's version calls Module 01's plain
// insertHtmlElement for implied <tbody>/<tr>, which inserts directly into the
// current node's .children with no template-content redirection. That was always
// an incomplete reading of the spec (EVERY "insert an html element" call routes
// through "appropriate place for inserting a node" — Module 05's DECISIONS.md
// justified reusing it as "spec-accurate," which was true for every case that
// module tested, since the foster-parenting gate is false during these implied
// insertions either way, but silently missed that appropriate-place's template
// redirect (this module's whole subject) applies regardless of that gate. Fixed
// here by using insertElementAtAppropriatePlace11 for the implied elements too. See
// DECISIONS.md.
function inTableSpecificRules11(token, state) {
  if (token.type !== 'StartTag') return false;
  if (token.tagName === 'td' || token.tagName === 'th') {
    clearStackBackToTableContext(state);
    const cur2 = state.stack[state.stack.length - 1];
    if (!cur2 || cur2.tagName !== 'tr') {
      if (!cur2 || !TABLE_BODY_TAGS.includes(cur2.tagName)) {
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
    const cur2 = state.stack[state.stack.length - 1];
    if (!cur2 || !TABLE_BODY_TAGS.includes(cur2.tagName)) {
      insertElementAtAppropriatePlace11(state, 'tbody');
    }
    insertElementAtAppropriatePlace11(state, token.tagName, token.attrs);
    return true;
  }
  return false;
}

function inBodyFosterAware11(token, state) {
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
    const cur = currentNode(state);
    if (cur && cur.tagName === token.tagName) {
      state.stack.pop();
      if (token.tagName === 'td' || token.tagName === 'th') {
        clearActiveFormattingElementsToLastMarker(state);
      }
      return;
    }
  }
  throw new NotImplementedYet('in body (Module 11, template-aware)', token);
}

function dispatch11(token, state, log) {
  // <template> is intercepted here, before any mode-specific routing, because it's
  // handled identically (never fostered, always gets .content) whether current node
  // is table-family or not.
  if (token.type === 'StartTag' && token.tagName === 'template') {
    insertTemplateElement(state, token.attrs);
    return;
  }

  if (state.mode === 'in table text') {
    return handleInTableText(token, state, log, dispatch11, insertCharWithReconstruction11);
  }
  if (state.mode === 'in table' && token.type === 'Character') {
    enterInTableText(state);
    return dispatch11(token, state, log);
  }
  if (state.mode === 'in table') {
    if (inTableRefusesFostering(token, state)) return;
    if (inTableSpecificRules11(token, state)) return;
    log('enable');
    state.fosterParentingEnabled = true;
    try {
      inBodyFosterAware11(token, state);
    } finally {
      log('disable');
      state.fosterParentingEnabled = false;
    }
    return;
  }
  if (state.mode === 'in body') {
    return inBodyFosterAware11(token, state);
  }
  return dispatch(token, state);
}

function createParserState11() {
  const state = createParserState();
  state.activeFormattingElements = [];
  return state;
}

module.exports = { dispatch11, createParserState11 };
