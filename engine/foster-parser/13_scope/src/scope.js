'use strict';

// "Has an element target in scope": walk the stack of open elements from the top
// (current node) downward. Return true the moment `target` is found. Return false
// the moment any element in `scopeList` is found first — that element is a wall the
// walk never crosses. This engine has no MathML/SVG namespace tracking (Module 06's
// scoping decision), so the MathML/SVG entries the real spec's base scope list
// includes (mi/mo/mn/ms/mtext/annotation-xml, foreignObject/desc/title) are omitted
// — see DECISIONS.md.
function hasElementInScope(state, targetTagName, scopeList) {
  for (let i = state.stack.length - 1; i >= 0; i--) {
    const tagName = state.stack[i].tagName;
    if (tagName === targetTagName) return true;
    if (scopeList.has(tagName)) return false;
  }
  return false;
}

const BASE_SCOPE = new Set(['applet', 'caption', 'html', 'table', 'td', 'th', 'marquee', 'object', 'select', 'template']);
const LIST_ITEM_SCOPE = new Set([...BASE_SCOPE, 'ol', 'ul']);
const BUTTON_SCOPE = new Set([...BASE_SCOPE, 'button']);
const TABLE_SCOPE = new Set(['html', 'table', 'template']);

function hasInScope(state, targetTagName) {
  return hasElementInScope(state, targetTagName, BASE_SCOPE);
}
function hasInListItemScope(state, targetTagName) {
  return hasElementInScope(state, targetTagName, LIST_ITEM_SCOPE);
}
function hasInButtonScope(state, targetTagName) {
  return hasElementInScope(state, targetTagName, BUTTON_SCOPE);
}
function hasInTableScope(state, targetTagName) {
  return hasElementInScope(state, targetTagName, TABLE_SCOPE);
}

module.exports = {
  BASE_SCOPE,
  LIST_ITEM_SCOPE,
  BUTTON_SCOPE,
  TABLE_SCOPE,
  hasElementInScope,
  hasInScope,
  hasInListItemScope,
  hasInButtonScope,
  hasInTableScope,
};
