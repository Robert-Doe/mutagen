'use strict';

const { dispatch, insertHtmlElement, currentNode, NotImplementedYet } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { insertCharacterAtAppropriatePlace, insertElementAtAppropriatePlace } = require('./location.js');

// A foster-aware replacement for Module 01's "in body" character/table handling.
// Same externally observable rules, but every insertion goes through
// getAdjustedInsertionLocation (this module's whole subject) instead of Module 01's
// hardcoded "current node, last child." Module 03 could reuse Module 01's MODES['in
// body'] directly because it never needed to change WHERE insertion happens — only
// Module 05 does, so this module needs its own equivalent rule set. See DECISIONS.md
// for why that's a deliberate escalation, not a duplication for its own sake.
//
// Also adds one small extension Module 01 never needed: a generic "any other start
// tag" / "any other end tag" fallback, enough to handle plain elements like <div>
// that this module's own test cases require but that don't need any special rule of
// their own (real "in body" has dozens of specific per-tag rules; we don't reproduce
// them — see DECISIONS.md).
function inBodyFosterAware(token, state) {
  if (token.type === 'Character') {
    insertCharacterAtAppropriatePlace(state, token.data);
    return;
  }
  if (token.type === 'StartTag' && token.tagName === 'table') {
    insertElementAtAppropriatePlace(state, token.tagName, token.attrs);
    state.mode = 'in table';
    return;
  }
  if (token.type === 'StartTag') {
    insertElementAtAppropriatePlace(state, token.tagName, token.attrs);
    return;
  }
  if (token.type === 'EndTag') {
    const cur = currentNode(state);
    if (cur && cur.tagName === token.tagName) {
      state.stack.pop();
      return;
    }
  }
  throw new NotImplementedYet('in body (Module 05, foster-aware)', token);
}

// A deliberately minimal slice of "in table"'s specific (non-fostering) tag rules —
// only <td> and <tr>, the two this module's nested-table test case needs to reach.
// Real "in table" also has specific rules for <th>, <tbody>/<thead>/<tfoot>,
// <caption>, <colgroup>, <col>, <table>, <style>/<script>/<template>,
// <input type=hidden>, and <form> — deferred to Modules 06, 07, and 12. Each implied
// element is inserted with Module 01's plain insertHtmlElement (ordinary, current-
// node insertion) because these ARE the elements the spec inserts BEFORE the
// anything-else/foster-parenting fallback is ever reached — see DECISIONS.md.
const TABLE_BODY_TAGS = ['tbody', 'thead', 'tfoot'];

function inTableSpecificRules(token, state) {
  if (token.type !== 'StartTag') return false;
  const cur = currentNode(state);
  if (token.tagName === 'td' || token.tagName === 'th') {
    // Only imply a <tbody>/<tr> if one isn't already open — a bare "always imply
    // both" (this function's original form) double-inserts when a real <tr> is
    // already the current node, e.g. <table><tr><td>. Caught by Module 08's test
    // cases; see that module's DECISIONS.md and the addendum at the foot of this
    // module's own DECISIONS.md.
    if (!cur || cur.tagName !== 'tr') {
      if (!cur || !TABLE_BODY_TAGS.includes(cur.tagName)) {
        insertHtmlElement(state, 'tbody');
      }
      insertHtmlElement(state, 'tr');
    }
    insertHtmlElement(state, token.tagName, token.attrs);
    return true;
  }
  if (token.tagName === 'tr') {
    if (!cur || !TABLE_BODY_TAGS.includes(cur.tagName)) {
      insertHtmlElement(state, 'tbody');
    }
    insertHtmlElement(state, token.tagName, token.attrs);
    return true;
  }
  return false;
}

// This module's dispatch entry point. Delegates to Module 01's dispatch() for every
// mode before "in body" (initial…after head — untouched since Module 01). From "in
// body"/"in table" onward, foster-aware handling takes over.
//
// Note: this engine does not implement "in row" or "in cell" as distinct insertion
// modes — after <tr> or <td>/<th> is opened, mode stays "in table" rather than
// switching to a dedicated mode. This is safe because the two-condition gate
// (Module 02) already discriminates fostering behavior purely from the CURRENT NODE,
// independent of the mode's name — a <tr> current node fosters, a <td> current node
// doesn't, regardless of which named mode we call it. See DECISIONS.md.
function dispatch5(token, state, log) {
  if (state.mode === 'in table') {
    if (inTableSpecificRules(token, state)) return;
    log('enable');
    state.fosterParentingEnabled = true;
    try {
      inBodyFosterAware(token, state);
    } finally {
      log('disable');
      state.fosterParentingEnabled = false;
    }
    return;
  }
  if (state.mode === 'in body') {
    return inBodyFosterAware(token, state);
  }
  return dispatch(token, state);
}

module.exports = { dispatch5, inBodyFosterAware, inTableSpecificRules };
