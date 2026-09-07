'use strict';

// The five table-family elements the attached reference course's own Module 02
// ("Why exactly five elements") derives and names. A frozen Set, not an array or a
// plain object: membership checks are O(1) and Object.freeze stops any later module
// from accidentally mutating the "canon" list of five while debugging something else.
const FOSTER_PARENT_TARGETS = Object.freeze(new Set(['table', 'tbody', 'tfoot', 'thead', 'tr']));

// The two-condition gate from "appropriate place for inserting a node" step 2,
// isolated as a pure predicate with no side effects. Deliberately decoupled from:
//   - HOW state.fosterParentingEnabled gets toggled (Module 03's job)
//   - WHERE a fostered node actually goes if this returns true (Module 05's job)
// so each of those can be built, explained, and tested independently.
function isFosterParentingTarget(state) {
  const target = state.stack[state.stack.length - 1];
  return (
    Boolean(state.fosterParentingEnabled) &&
    Boolean(target) &&
    FOSTER_PARENT_TARGETS.has(target.tagName)
  );
}

module.exports = { FOSTER_PARENT_TARGETS, isFosterParentingTarget };
