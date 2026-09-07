'use strict';

// The MERGE tactic: a second <html> start tag doesn't create a new node — its
// attributes are merged onto the ONE html element that already exists. First
// occurrence wins per attribute name; new attribute names are added.
//
// Per this engine's design, state.stack[0] is always the html root (Module 01's
// `before html` handler guarantees exactly one is ever created there).
function mergeHtmlAttributes(state, token) {
  const root = state.stack[0];
  for (const [name, value] of token.attrs) {
    if (!root.attrs.has(name)) {
      root.attrs.set(name, value);
    }
  }
}

module.exports = { mergeHtmlAttributes };
