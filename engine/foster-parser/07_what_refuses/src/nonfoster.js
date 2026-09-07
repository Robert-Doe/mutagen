'use strict';

const { insertHtmlElement, currentNode } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { insertNode, CommentNode } = require('../../00_tokens_and_nodes/src/nodes.js');

// "in table"'s explicitly-handled cases: tokens that reach their OWN clause before
// the anything-else/foster-parenting fallback (Module 03) is ever consulted. Scoped
// to exactly the cases this module's test inputs need:
//   - <style>/<script>/<template> — real spec: "processed with the in head rules."
//     Simplified here to plain ordinary insertion (this engine has no separate "in
//     head" rule table to borrow, and no RAWTEXT tokenizer state — see DECISIONS.md;
//     the simplification is invisible for this module's test input specifically).
//   - <input type=hidden> (case-insensitive) — inserted, then IMMEDIATELY popped.
//   - any OTHER <input> — deliberately NOT handled here; falls through to fostering.
//   - <form> — inserted, then immediately popped: permanently childless. No "form
//     element pointer" is modeled (see DECISIONS.md) — this module's test never
//     needs to reject a SECOND form, which is the only thing that pointer gates.
//   - a comment token — inserted ordinarily, never fostered.
//   - a DOCTYPE token — parse error, ignored: consumed, nothing inserted.
//
// Returns true if the token was fully handled here (fostering must NOT run for it),
// false if the caller should fall through to the anything-else fallback.
function inTableRefusesFostering(token, state) {
  if (token.type === 'StartTag' && ['style', 'script', 'template'].includes(token.tagName)) {
    insertHtmlElement(state, token.tagName, token.attrs);
    return true;
  }
  if (token.type === 'EndTag' && ['style', 'script', 'template'].includes(token.tagName)) {
    const cur = currentNode(state);
    if (cur && cur.tagName === token.tagName) state.stack.pop();
    return true;
  }
  if (token.type === 'StartTag' && token.tagName === 'input') {
    const type = (token.attrs.get('type') || '').toLowerCase();
    if (type === 'hidden') {
      insertHtmlElement(state, token.tagName, token.attrs);
      state.stack.pop(); // "insert the element, then immediately pop it"
      return true;
    }
    return false; // any other type, or none: falls through to fostering
  }
  if (token.type === 'StartTag' && token.tagName === 'form') {
    insertHtmlElement(state, token.tagName, token.attrs);
    state.stack.pop(); // childless, permanently
    return true;
  }
  if (token.type === 'Comment') {
    insertNode(currentNode(state), new CommentNode(token.data));
    return true;
  }
  if (token.type === 'DOCTYPE') {
    return true; // parse error, ignore
  }
  return false;
}

module.exports = { inTableRefusesFostering };
