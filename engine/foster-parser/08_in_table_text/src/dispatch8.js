'use strict';

const { dispatch } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { inBodyFosterAware, inTableSpecificRules } = require('../../05_seven_substeps/src/dispatch5.js');
const { inTableRefusesFostering } = require('../../07_what_refuses/src/nonfoster.js');
const { enterInTableText, handleInTableText } = require('./tabletext.js');

// This module's dispatch entry point: Module 07's dispatch7, with character tokens
// arriving in "in table" mode now buffered ("in table text") instead of falling
// straight through to the anything-else fallback per-character.
function dispatch8(token, state, log) {
  if (state.mode === 'in table text') {
    return handleInTableText(token, state, log, dispatch8);
  }

  if (state.mode === 'in table' && token.type === 'Character') {
    enterInTableText(state);
    return dispatch8(token, state, log); // reprocess the same token, now buffered
  }

  if (state.mode === 'in table') {
    if (inTableRefusesFostering(token, state)) return;
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

module.exports = { dispatch8 };
