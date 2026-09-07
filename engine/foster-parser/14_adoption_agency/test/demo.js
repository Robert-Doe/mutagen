'use strict';

const assert = require('node:assert/strict');
const { tokenize } = require('../../01_stack_and_dispatch/src/tokenizer.js');
const { NotImplementedYet } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { ElementNode, TextNode } = require('../../00_tokens_and_nodes/src/nodes.js');
const { dispatch14, createParserState14 } = require('../src/dispatch14.js');

function serializeLikeBrowser(node, depth = 0, out = []) {
  const indent = '  '.repeat(depth);
  if (node instanceof ElementNode) {
    const id = node.attrs.get('id');
    out.push(indent + node.tagName + (id ? '#' + id : ''));
  } else if (node instanceof TextNode) {
    out.push(indent + '#text ' + JSON.stringify(node.data));
  }
  for (const child of node.children || []) serializeLikeBrowser(child, depth + 1, out);
  return out;
}

function run(html) {
  const tokens = tokenize(html);
  const state = createParserState14();
  const log = [];
  for (const token of tokens) {
    try {
      dispatch14(token, state, (event) => log.push(event));
    } catch (err) {
      if (err instanceof NotImplementedYet) break;
      throw err;
    }
  }
  const htmlEl = state.document.children.find((c) => c.tagName === 'html');
  const body = htmlEl.children.find((c) => c.tagName === 'body');
  return { body, log };
}

function check(label, html, expectedLines, expectedLog) {
  console.log(`── ${label} ──`);
  console.log(html);
  const { body, log } = run(html);
  const actual = serializeLikeBrowser(body).join('\n');
  console.log(actual);
  console.log('log:', log.join(' → '), '\n');
  assert.equal(actual, expectedLines.join('\n'), `${label}: must match real browser DOMParser output exactly`);
  if (expectedLog) assert.deepEqual(log, expectedLog, `${label}: unexpected algorithm path taken`);
}

// ── Case 1: the textbook <b>/<i> overlap — does NOT trigger cloning ──
check(
  'Case 1: <b>1<i>2</b>3</i>4 — the "no furthest block" path (plain pop, no cloning)',
  '<!DOCTYPE html><head></head><body><b>1<i>2</b>3</i>4</body>',
  ['body', '  b', '    #text "1"', '    i', '      #text "2"', '  i', '    #text "3"', '  #text "4"'],
  ['no-furthest-block', 'no-furthest-block']
);

// ── Case 2: a <div> misnested inside <b> — the REAL cloning path ──
check(
  'Case 2: a structural element (<div>) misnested inside <b> — full clone-and-relocate',
  '<!DOCTYPE html><head></head><body><div id="outer"><b>bold<div id="inner">block</b>after</div>more</body>',
  [
    'body',
    '  div#outer',
    '    b',
    '      #text "bold"',
    '    div#inner',
    '      b',
    '        #text "block"',
    '      #text "after"',
    '    #text "more"',
  ],
  ['cloning', 'no-furthest-block']
);

// ── Case 3: a <table> misnested inside <b> — cloning AND foster parenting in the same call ──
console.log('── Case 3: a <table> misnested inside <b> — cloning meets foster parenting ──');
console.log('<!DOCTYPE html><head></head><body><b>bold<table>after</b>more</body>\n');
const { body: body3, log: log3 } = run('<!DOCTYPE html><head></head><body><b>bold<table>after</b>more</body>');
const actual3 = serializeLikeBrowser(body3).join('\n');
console.log(actual3);
console.log('log:', log3.join(' → '));
const EXPECTED_3 = ['body', '  b', '    #text "boldaftermore"', '    table'].join('\n');
assert.equal(actual3, EXPECTED_3, 'Case 3 must match real browser DOMParser output exactly');

console.log('\nOK — all assertions passed. Track 1 Module 14 adoption agency algorithm verified against real browser output.');
