'use strict';

const { dispatch, MODES, NotImplementedYet } = require('../../01_stack_and_dispatch/src/dispatch.js');

// The ONE place foster parenting's flag is ever set — the "anything else" clause of
// "in table" mode. Verbatim from the spec (quoted in the attached reference course's
// own Module 01): "Enable foster parenting, process the token using the rules for
// the 'in body' insertion mode, then disable foster parenting."
//
// "Process the token using the rules for the in body insertion mode" is a specific
// spec technique (see prerequisites/prereq_insertion_modes.html) — it means invoke
// in body's own rule table for this one token, WITHOUT changing state.mode, unless
// in body's rule for that specific token explicitly says to switch modes itself (as
// it does for a <table> start tag). That's why this calls MODES['in body'] directly
// rather than setting state.mode = 'in body' and going through dispatch() — the
// latter would be indistinguishable from a real mode switch, which this is not.
function inTableAnythingElse(token, state, log = () => {}) {
  log('enable');
  state.fosterParentingEnabled = true;
  try {
    MODES['in body'](token, state);
  } finally {
    // "then disable foster parenting" — unconditionally, even if in body's rules
    // above threw. The flag's lifetime is scoped to "attempting to process one
    // token," not to that attempt succeeding — see DECISIONS.md.
    log('disable');
    state.fosterParentingEnabled = false;
  }
}

// The engine's dispatch entry point, foster-parenting-aware: routes to Module 01's
// ordinary dispatch() for every mode except 'in table', where it instead runs the
// anything-else clause above. 'in table' still has no rules of its own beyond this
// one fallback — later modules add specific-tag rules before this fallback fires.
function dispatchWithFosterParenting(token, state, log) {
  if (state.mode === 'in table') {
    return inTableAnythingElse(token, state, log);
  }
  return dispatch(token, state);
}

module.exports = { inTableAnythingElse, dispatchWithFosterParenting, NotImplementedYet };
