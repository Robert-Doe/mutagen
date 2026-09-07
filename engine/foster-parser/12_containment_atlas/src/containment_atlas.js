'use strict';

// A map of every container this course's engine (or the real spec) has containment
// opinions about, each tagged with which of the spec's recovery tactics applies.
// `implemented` names the module that built real, tested code for that row, or
// `false` with a one-line reason when this engine deliberately doesn't (consistent
// with every prior "honest gap" this course has logged — see DECISIONS.md).
const CONTAINMENT_ATLAS = [
  { element: 'table / tbody / thead / tfoot / tr', tactic: 'FOSTER', implemented: 'Modules 02–11' },
  { element: 'td / th', tactic: 'none (flow content)', implemented: 'Module 04 (proves it does NOT foster)' },
  {
    element: 'html (second occurrence)',
    tactic: 'MERGE',
    implemented: 'Module 12 (this module)',
  },
  {
    element: 'DOCTYPE mid-table',
    tactic: 'IGNORE',
    implemented: 'Module 07',
  },
  {
    element: 'input[type=hidden], form',
    tactic: 'explicit clause, then immediate pop',
    implemented: 'Module 07',
  },
  {
    element: '"in table" anything-else → "in body" rules',
    tactic: 'REDIRECT',
    implemented: 'Module 03 (mode-level REDIRECT; see DECISIONS.md for why this counts and style/script/template do not)',
  },
  {
    element: 'initial/before-html/before-head implied-element cascades; "in table text" flush',
    tactic: 'POP+REPROCESS-style reprocessing',
    implemented: 'Module 01, Module 08 (the general "reprocess the token" mechanism, used repeatedly)',
  },
  {
    element: 'style / script / template (inside a table)',
    tactic: 'REDIRECT (real: "processed with in head rules")',
    implemented: false,
    reason: 'Module 07 uses plain ordinary insertion, not a true redirect to a separate "in head" rule table this engine never built generally.',
  },
  {
    element: 'caption / colgroup',
    tactic: 'POP+REPROCESS',
    implemented: false,
    reason: 'No "in caption"/"in column group" modes exist in this engine — flagged already in Module 04\'s atlas.',
  },
  {
    element: 'p / li / dd / dt / option / optgroup / h1–h6 / button',
    tactic: 'CLOSE',
    implemented: false,
    reason: 'No implicit-closing-on-new-start-tag logic exists in this engine\'s generic StartTag handling.',
  },
  {
    element: 'a / nobr',
    tactic: 'ADOPTION AGENCY',
    implemented: false,
    reason: 'Out of scope for the whole course — see Track 1 Module 10\'s vocabulary web, concept_adoption_agency.html.',
  },
  {
    element: 'select (historical "in select"/"in select in table" modes)',
    tactic: 'was CLOSE-like special-casing; now ordinary (2024–25 spec change)',
    implemented: false,
    reason: 'Not built either version — see the attached reference course\'s own Module 12 for the historical/current spec comparison.',
  },
  {
    element: 'script / style / title / textarea / xmp / iframe / noembed / noframes / plaintext',
    tactic: 'TOKENIZER (RAWTEXT/RCDATA)',
    implemented: false,
    reason: 'No RAWTEXT/RCDATA tokenizer state — flagged as out of scope since Module 01\'s tokenizer.js.',
  },
  {
    element: 'area / base / br / col / embed / hr / img / input / link / meta / source / track / wbr',
    tactic: 'VOID',
    implemented: false,
    reason: 'ElementNode (Module 00) does not structurally forbid children on any tag — voidness is not enforced.',
  },
];

module.exports = { CONTAINMENT_ATLAS };
