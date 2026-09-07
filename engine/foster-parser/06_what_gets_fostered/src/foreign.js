'use strict';

const { insertElementAtAppropriatePlace } = require('../../05_seven_substeps/src/location.js');

// The spec names "insert a foreign element" as a distinct algorithm from "insert an
// HTML element" — it does extra namespace bookkeeping this engine doesn't model
// (Module 00 deliberately scoped ElementNode to have no namespace field; see that
// module's DECISIONS.md). But for the ONE question this course cares about — does
// it route through "appropriate place for inserting a node"? — the two algorithms
// are identical, and always were meant to be (see the 2013 bug below). This function
// is a thin, deliberately trivial alias, not a reimplementation, to make that
// identity explicit rather than accidental. See DECISIONS.md.
function insertForeignElementAtAppropriatePlace(state, tagName, attrs = new Map()) {
  return insertElementAtAppropriatePlace(state, tagName, attrs);
}

module.exports = { insertForeignElementAtAppropriatePlace };
