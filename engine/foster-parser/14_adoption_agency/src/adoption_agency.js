'use strict';

const { currentNode } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { ElementNode, insertNode } = require('../../00_tokens_and_nodes/src/nodes.js');
const { MARKER } = require('../../10_formatting_triple_b/src/formatting.js');
const { hasInScope } = require('../../13_scope/src/scope.js');
const { SPECIAL_CATEGORY } = require('./special_category.js');
const { insertNodeAtAppropriatePlaceFor } = require('./location_override.js');

// A bug this module's own test caught: Module 00's `insertNode` (nodes.js) splices
// a node into a new parent's children but never removes it from an OLD parent's
// children array first. That was always correct for every use across 19 prior
// modules — tree construction only ever inserts FRESHLY CREATED nodes, which have
// no old parent to clean up. This module is the first thing in the whole course
// that needs to MOVE an already-parented node (with its own existing parent and
// possibly its own children) — several steps below do exactly that. Calling the
// plain `insertNode` for any of them produced a node referenced by BOTH its old and
// new parent's children arrays simultaneously, which is what turned one clone into
// an exponentially duplicating tree across the outer loop's iterations before this
// was caught. Fixed here, locally, rather than editing Module 00's already-verified
// file — same additive-extension pattern this course has used since Module 03. See
// DECISIONS.md.
function moveNode(newParent, node, index = newParent.children.length) {
  if (node.parent) {
    const oldSiblings = node.parent.children;
    const oldIndex = oldSiblings.indexOf(node);
    if (oldIndex !== -1) oldSiblings.splice(oldIndex, 1);
  }
  insertNode(newParent, node, index);
}

// The adoption agency algorithm, implemented against the WHATWG HTML Standard's
// current text, fetched and quoted directly in this module's own DECISIONS.md
// rather than recalled from memory — two real mistakes were caught and corrected
// by doing that (see DECISIONS.md's bug narrative). `subjectTagName` is the tag
// name of the end tag token that triggered this call. `log` receives one string
// per named step this run actually took.
//
// Deliberately scoped: this engine only ever calls this for tags in the (locally
// extended) formatting-elements set built in dispatch14.js, matching every other
// module's narrow-but-real scoping choice. The algorithm's CONTROL FLOW is
// implemented in full — all three outer-loop exit branches, the inner cloning
// loop, the 8-iteration cap, the Noah's-Ark-adjacent >3 pruning — nothing about the
// logic itself is trimmed, only which tag names ever reach it.
function runAdoptionAgency(state, subjectTagName, log = () => {}) {
  const list = state.activeFormattingElements;

  const cur = currentNode(state);
  if (cur && cur.tagName === subjectTagName && !list.includes(cur)) {
    state.stack.pop();
    log('trivial-pop');
    return;
  }

  let outerLoopCounter = 0;
  while (outerLoopCounter < 8) {
    outerLoopCounter += 1;

    let formattingElement = null;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i] === MARKER) break;
      if (list[i].tagName === subjectTagName) {
        formattingElement = list[i];
        break;
      }
    }
    if (!formattingElement) {
      log('no-formatting-element-found');
      return; // real spec: falls through to ordinary "any other end tag" handling
    }

    if (!state.stack.includes(formattingElement)) {
      log('formatting-element-not-on-stack');
      const idx = list.indexOf(formattingElement);
      if (idx !== -1) list.splice(idx, 1);
      return;
    }

    if (!hasInScope(state, formattingElement.tagName)) {
      log('formatting-element-not-in-scope');
      return;
    }
    // (formattingElement not being current node is a parse error, but not fatal —
    // processing continues either way, exactly like every other "parse error;
    // continue" moment since Module 01's own DOCTYPE bug narrative.)

    const feStackIndex = state.stack.indexOf(formattingElement);
    let furthestBlock = null;
    let furthestBlockIndex = -1;
    for (let i = feStackIndex + 1; i < state.stack.length; i++) {
      if (SPECIAL_CATEGORY.has(state.stack[i].tagName)) {
        furthestBlock = state.stack[i];
        furthestBlockIndex = i;
        break;
      }
    }

    if (!furthestBlock) {
      log('no-furthest-block');
      while (state.stack.length && state.stack[state.stack.length - 1] !== formattingElement) {
        state.stack.pop();
      }
      state.stack.pop();
      const idx = list.indexOf(formattingElement);
      if (idx !== -1) list.splice(idx, 1);
      return;
    }

    log('cloning');
    const commonAncestor = state.stack[feStackIndex - 1];
    let bookmarkIndex = list.indexOf(formattingElement);

    let lastNode = furthestBlock;
    let innerLoopCounter = 0;
    // Walk by INDEX, not by re-deriving a stack position from a node reference each
    // time — the spec explicitly allows for `node` having already been removed
    // from the stack by an earlier inner-loop iteration ("...or if node is no
    // longer in the stack of open elements... the element that was immediately
    // above node... before node was removed"). Indices below the one we just acted
    // on are never disturbed by removing it, so a plain decrement is always
    // correct here — see DECISIONS.md.
    let cursor = furthestBlockIndex;

    while (true) {
      innerLoopCounter += 1;
      cursor -= 1;
      let node = state.stack[cursor];
      if (node === formattingElement) break;

      if (innerLoopCounter > 3 && list.includes(node)) {
        const rmIdx = list.indexOf(node);
        list.splice(rmIdx, 1);
        if (rmIdx < bookmarkIndex) bookmarkIndex -= 1;
      }

      if (!list.includes(node)) {
        state.stack.splice(cursor, 1);
        continue;
      }

      const clone = new ElementNode(node.tagName);
      for (const [k, v] of node.attrs) clone.attrs.set(k, v);

      const listIdx = list.indexOf(node);
      list[listIdx] = clone;
      state.stack[cursor] = clone;

      if (lastNode === furthestBlock) {
        bookmarkIndex = listIdx + 1; // "move the bookmark to immediately after" the clone
      }

      moveNode(clone, lastNode); // "append lastNode to node [the clone]" — lastNode already has a parent
      lastNode = clone;
    }

    // Relocate lastNode via the FULL foster-aware "appropriate place for inserting
    // a node," with commonAncestor as override target. If commonAncestor happens
    // to be table-family and the flag is live, this fosters, automatically, with
    // no special-casing here — confirmed against parse5's real source
    // (`_isElementCausesFosterParenting` gates exactly this call). See DECISIONS.md.
    insertNodeAtAppropriatePlaceFor(state, lastNode, commonAncestor);

    const feClone = new ElementNode(formattingElement.tagName);
    for (const [k, v] of formattingElement.attrs) feClone.attrs.set(k, v);

    for (const child of [...furthestBlock.children]) {
      moveNode(feClone, child);
    }
    insertNode(furthestBlock, feClone); // feClone is freshly created — never had an old parent

    const feListIndex = list.indexOf(formattingElement);
    list.splice(feListIndex, 1);
    if (feListIndex < bookmarkIndex) bookmarkIndex -= 1;
    list.splice(bookmarkIndex, 0, feClone);

    // A second real bug this module's own test caught, found only after checking
    // parse5's actual source (see DECISIONS.md): the spec prose ("insert the new
    // element into the stack of open elements immediately below the position of
    // furthestBlock") reads as "just before furthestBlock" — which was this
    // module's first attempt, and which leaves furthestBlock as the current node,
    // causing the NEXT outer-loop iteration to find the exact same furthestBlock
    // again and clone endlessly (verified: 8 iterations, 8 nested <b> tags, before
    // this fix). The correct placement — confirmed against parse5's
    // `openElements.insertAfter(furthestBlock, newElement, ...)` — is immediately
    // AFTER furthestBlock, making the new clone the new CURRENT NODE. With the
    // clone as current node, the next outer-loop iteration's furthest-block search
    // starts AT the formatting element itself and immediately finds nothing below
    // it to search — the "no furthest block" branch fires, and the loop
    // terminates correctly after exactly one pass.
    const feStackIndex2 = state.stack.indexOf(formattingElement);
    state.stack.splice(feStackIndex2, 1);
    const fbIndex = state.stack.indexOf(furthestBlock);
    state.stack.splice(fbIndex + 1, 0, feClone);

    // Loop again — up to 8 total — in case formattingElement is STILL misnested
    // relative to whatever the tree looks like now.
  }
  log('outer-loop-limit-reached');
}

module.exports = { runAdoptionAgency };
