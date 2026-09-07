'use strict';

const { dispatch } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { inBodyFosterAware, inTableSpecificRules } = require('../../05_seven_substeps/src/dispatch5.js');
const { inTableRefusesFostering } = require('./nonfoster.js');

// This module's dispatch entry point: Module 05's dispatch5, with one more check
// layered in FIRST — "does 'in table' explicitly refuse to foster this token?"
// (this module's own inTableRefusesFostering) — before Module 05's specific-tag
// rules (<td>/<th>/<tr>) and before the anything-else/foster-parenting fallback.
//
// The enable/disable bracket around the fallback is duplicated from Module 05's
// dispatch5, rather than extracted into a shared function Module 05 would need to
// export retroactively — see DECISIONS.md for why editing an already-verified
// module's file was judged not worth it for three duplicated lines.
function dispatch7(token, state, log) {
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

module.exports = { dispatch7 };
