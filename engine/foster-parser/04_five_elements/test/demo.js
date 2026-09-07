'use strict';

const assert = require('node:assert/strict');
const { FOSTER_PARENT_TARGETS } = require('../../02_two_conditions_one_gate/src/foster.js');
const { TABLE_FAMILY_ATLAS, checkTarget } = require('../src/atlas.js');

console.log('── Testing every table-family element (and one control) as current node ──\n');

const mismatches = [];
const actuallyFosters = [];

for (const row of TABLE_FAMILY_ATLAS) {
  const actual = checkTarget(row.tag);
  const mark = actual === row.fosters ? 'OK' : 'MISMATCH';
  console.log(`<${row.tag}>`.padEnd(12), '→', String(actual).padEnd(6), mark.padEnd(9), row.reason);
  if (actual !== row.fosters) mismatches.push(row.tag);
  if (actual) actuallyFosters.push(row.tag);
}

assert.deepEqual(mismatches, [], `every atlas row's predicted "fosters" must match isFosterParentingTarget()'s actual answer; mismatches: ${mismatches}`);

assert.deepEqual(
  actuallyFosters.sort(),
  [...FOSTER_PARENT_TARGETS].sort(),
  'the set of elements that actually foster must be exactly Module 02\'s FOSTER_PARENT_TARGETS — five, no more, no fewer'
);

console.log(`\nElements that foster: ${actuallyFosters.join(', ')} (${actuallyFosters.length} of them)`);
console.log('OK — all assertions passed. Module 04 five-element derivation verified.');
