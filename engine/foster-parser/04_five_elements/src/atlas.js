'use strict';

const { isFosterParentingTarget } = require('../../02_two_conditions_one_gate/src/foster.js');
const { ElementNode } = require('../../00_tokens_and_nodes/src/nodes.js');

// Every table-related element the HTML content model defines (plus one unrelated
// control case), each annotated with WHY it does or doesn't foster. This re-derives
// Module 02's FOSTER_PARENT_TARGETS element-by-element instead of asserting it as a
// given — the point of this module.
//
// Note on `reason`: for `table`/`tbody`/`thead`/`tfoot`/`tr`/`td`/`th`/`caption`, the
// reason is checkable directly against `isFosterParentingTarget()`'s actual behavior
// below. For `colgroup` and `col`, the reason describes a real spec mechanism this
// engine does NOT yet implement (Module 01/03 have no "in column group" mode and no
// void-element handling) — see DECISIONS.md for why those two rows are honestly
// flagged as "documented, not yet mechanically enforced."
const TABLE_FAMILY_ATLAS = [
  { tag: 'table', fosters: true, reason: 'CSS display:table generates no box capable of holding non-table content' },
  { tag: 'tbody', fosters: true, reason: 'CSS display:table-row-group has no box that isn\'t made of rows' },
  { tag: 'thead', fosters: true, reason: 'CSS display:table-header-group has no box that isn\'t made of rows' },
  { tag: 'tfoot', fosters: true, reason: 'CSS display:table-footer-group has no box that isn\'t made of rows' },
  { tag: 'tr', fosters: true, reason: 'CSS display:table-row has no box of its own that isn\'t made of cells' },
  { tag: 'td', fosters: false, reason: 'content model is flow content — a cell hosts anything' },
  { tag: 'th', fosters: false, reason: 'content model is flow content — a header cell hosts anything' },
  { tag: 'caption', fosters: false, reason: 'content model is flow content — same reasoning as td/th' },
  {
    tag: 'colgroup',
    fosters: false,
    reason:
      'spec mechanism (not yet built here): popped and reprocessed into "in table" before it can ever ' +
      'be the current node while the flag is live',
  },
  {
    tag: 'col',
    fosters: false,
    reason: 'spec mechanism (not yet built here): a void element, never stays on the stack long enough to be a target',
  },
  { tag: 'div', fosters: false, reason: 'not table-related at all — included as a control case' },
];

// Builds a minimal parser state whose current node is exactly `tag`, flag enabled,
// and asks Module 02's predicate whether it gates. Bypasses real parsing (no mode
// exists yet that would naturally make `colgroup` or `col` the current node) — see
// DECISIONS.md for why that's an honest simplification for this module's purpose.
function checkTarget(tag) {
  const state = { fosterParentingEnabled: true, stack: [new ElementNode(tag)] };
  return isFosterParentingTarget(state);
}

module.exports = { TABLE_FAMILY_ATLAS, checkTarget };
