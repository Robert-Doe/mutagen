'use strict';

const { tokenize } = require('./tokenizer.js');
const { createParserState, dispatch } = require('./dispatch.js');

// Runs the dispatch loop over every token from `tokenize(html)`, stopping (by
// letting NotImplementedYet propagate) the first time a token arrives for a mode
// this module doesn't implement. Callers that expect to hit that boundary (this
// module's own demo does, deliberately) should catch it themselves.
function parse(html) {
  const tokens = tokenize(html);
  const state = createParserState();
  for (const token of tokens) {
    dispatch(token, state);
  }
  return state;
}

module.exports = { parse };
