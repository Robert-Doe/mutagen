'use strict';

const {
  ElementNode,
  DocumentNode,
  TextNode,
  insertNode,
  tryFuseCharacter,
} = require('../../00_tokens_and_nodes/src/nodes.js');

// The insertion-mode dispatch loop (Prerequisite P4). Each entry in MODES is a
// function(token, state) that may push/pop state.stack, insert nodes, or switch
// state.mode. Only the modes needed to walk a minimal document from before <html>
// down to the first <table> start tag are implemented here — see DECISIONS.md for
// which spec rules each mode below narrows down to, and ROADMAP.md for which later
// module adds the next mode ("in table" itself starts in Module 02).

class NotImplementedYet extends Error {
  constructor(mode, token) {
    super(
      `Insertion mode "${mode}" has no rules yet in this engine (token: ${token.type}` +
      `${token.tagName ? ' ' + token.tagName : ''}). This engine currently implements ` +
      'modes through Module 01 (initial…in body, switching into "in table"). Reaching ' +
      'this error means the dispatch loop correctly reached the mode — its own rules ' +
      'are built starting in a later module.'
    );
    this.mode = mode;
    this.token = token;
  }
}

function createParserState() {
  return { document: new DocumentNode(), stack: [], mode: 'initial' };
}

function currentNode(state) {
  return state.stack[state.stack.length - 1];
}

// Shared by every mode below — this is "insert an HTML element" narrowed to what
// Module 01 needs: no push/pop of the active-formatting list (Module 10), no
// adjusted-insertion-location computation (Module 05) — just stack + tree insert.
function insertHtmlElement(state, tagName, attrs = new Map()) {
  const parent = state.stack.length ? currentNode(state) : state.document;
  const el = new ElementNode(tagName);
  for (const [k, v] of attrs) el.attrs.set(k, v);
  insertNode(parent, el);
  state.stack.push(el);
  return el;
}

function insertCharacter(state, data) {
  const parent = currentNode(state);
  if (!tryFuseCharacter(parent, data)) {
    insertNode(parent, new TextNode(data));
  }
}

const MODES = {
  initial(token, state) {
    if (token.type === 'DOCTYPE') {
      // Real rules append a DocumentType node here and inspect it for quirks mode.
      // This engine has no DocumentType node kind (deliberately out of scope — see
      // DECISIONS.md) and no quirks-mode concept, so a DOCTYPE token is fully
      // consumed by switching modes — it must NOT be reprocessed, unlike every
      // other token this mode sees.
      state.mode = 'before html';
      return;
    }
    // Any other token: switch to "before html" and reprocess the same token there.
    state.mode = 'before html';
    dispatch(token, state);
  },

  'before html'(token, state) {
    if (token.type === 'StartTag' && token.tagName === 'html') {
      insertHtmlElement(state, token.tagName, token.attrs);
      state.mode = 'before head';
      return;
    }
    insertHtmlElement(state, 'html');
    state.mode = 'before head';
    dispatch(token, state);
  },

  'before head'(token, state) {
    if (token.type === 'StartTag' && token.tagName === 'head') {
      insertHtmlElement(state, token.tagName, token.attrs);
      state.mode = 'in head';
      return;
    }
    insertHtmlElement(state, 'head');
    state.mode = 'in head';
    dispatch(token, state);
  },

  'in head'(token, state) {
    if (token.type === 'EndTag' && token.tagName === 'head') {
      state.stack.pop();
      state.mode = 'after head';
      return;
    }
    if (token.type === 'Character' && /\s/.test(token.data)) {
      insertCharacter(state, token.data);
      return;
    }
    throw new NotImplementedYet('in head', token);
  },

  'after head'(token, state) {
    if (token.type === 'StartTag' && token.tagName === 'body') {
      insertHtmlElement(state, token.tagName, token.attrs);
      state.mode = 'in body';
      return;
    }
    throw new NotImplementedYet('after head', token);
  },

  'in body'(token, state) {
    if (token.type === 'Character') {
      insertCharacter(state, token.data);
      return;
    }
    if (token.type === 'StartTag' && token.tagName === 'table') {
      // This is the one transition Module 01 exists to prove: reaching "in table"
      // for the first time. Everything "in table" actually does starts Module 02.
      insertHtmlElement(state, token.tagName, token.attrs);
      state.mode = 'in table';
      return;
    }
    throw new NotImplementedYet('in body', token);
  },

  // 'in table' has no entry on purpose — dispatch() below throws NotImplementedYet
  // for it, which is the signal this module's demo is built to catch.
};

function dispatch(token, state) {
  const handler = MODES[state.mode];
  if (!handler) throw new NotImplementedYet(state.mode, token);
  handler(token, state);
}

// MODES is exported (additively — nothing above changes) so later modules can invoke
// one specific mode's rule table directly, e.g. to implement the spec phrase "process
// the token using the rules for the in body insertion mode" — which does NOT mean
// "switch state.mode to in body." See Module 03's DECISIONS.md.
module.exports = { createParserState, dispatch, currentNode, insertHtmlElement, NotImplementedYet, MODES };
