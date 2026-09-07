'use strict';

const { insertCharacterAtAppropriatePlace } = require('../../05_seven_substeps/src/location.js');

const ASCII_WHITESPACE = /[ \t\n\f\r]/;

// "in table" does not handle character tokens directly (Prerequisite P1: they arrive
// one at a time, never batched). Instead it buffers them into `state.pendingCharacters`,
// remembers the mode it was in as `state.originalMode`, and switches to "in table
// text" — this file's subject.
function enterInTableText(state) {
  state.pendingCharacters = [];
  state.originalMode = state.mode;
  state.mode = 'in table text';
}

// "in table text"'s own rules. `dispatchFn` is passed in (rather than required
// directly) to avoid a circular require between this file and dispatch8.js — see
// DECISIONS.md. `insertChar` defaults to the plain Module 05 inserter, so every
// caller through Module 08 is unaffected; Module 10 passes a reconstruction-aware
// version instead, additively — see that module's DECISIONS.md.
function handleInTableText(token, state, log, dispatchFn, insertChar = insertCharacterAtAppropriatePlace) {
  if (token.type === 'Character') {
    // Buffer; emit nothing yet. The decision can't be made until the run ends.
    state.pendingCharacters.push(token.data);
    return;
  }

  // Anything else (the first non-character token, including EOF): decide, once,
  // over the WHOLE buffered run.
  const pending = state.pendingCharacters;
  const hasNonWhitespace = pending.some((ch) => !ASCII_WHITESPACE.test(ch));

  if (hasNonWhitespace) {
    // Parse error — reprocess the pending run using "in table"'s anything-else
    // clause, which enables foster parenting. Replaying one character at a time
    // through insertChar reproduces the spec's fusion behavior automatically
    // (Module 00/05's tryFuseCharacter), so the whole run lands as ONE text node,
    // exactly as if it had never been split into tokens.
    log('enable');
    state.fosterParentingEnabled = true;
    try {
      for (const ch of pending) insertChar(state, ch);
    } finally {
      log('disable');
      state.fosterParentingEnabled = false;
    }
  } else {
    // All ASCII whitespace: insert normally (ordinary location, current node) —
    // no parse error, nothing fostered.
    for (const ch of pending) insertChar(state, ch);
  }

  state.pendingCharacters = [];
  state.mode = state.originalMode;
  // "Reprocess the current token" — the non-character token that ended the run
  // never got handled; hand it back to the ordinary dispatcher, now that mode has
  // been restored.
  return dispatchFn(token, state, log);
}

module.exports = { enterInTableText, handleInTableText };
