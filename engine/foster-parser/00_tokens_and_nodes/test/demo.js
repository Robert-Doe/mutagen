'use strict';

const assert = require('node:assert/strict');
const {
  startTagToken,
  endTagToken,
  characterToken,
  tokenToString,
} = require('../src/tokens.js');
const {
  DocumentNode,
  ElementNode,
  TextNode,
  insertNode,
  tryFuseCharacter,
  renderTree,
} = require('../src/nodes.js');

// ── Part 1: hand-author a token stream for <div class="a"><p>hi <b>there</b></p></div>
// No tree construction algorithm exists yet (that starts Module 01) — this only proves
// tokens.js can represent every token shape this input needs, including an attribute.
const tokens = [
  startTagToken('div', [['class', 'a']]),
  startTagToken('p'),
  characterToken('h'),
  characterToken('i'),
  characterToken(' '),
  startTagToken('b'),
  characterToken('t'),
  characterToken('h'),
  characterToken('e'),
  characterToken('r'),
  characterToken('e'),
  endTagToken('b'),
  endTagToken('p'),
  endTagToken('div'),
];

console.log('── Token stream ──');
for (const t of tokens) console.log(tokenToString(t));

// ── Part 2: hand-build the DOM these tokens describe, exercising every node kind and
// the text-fusion helper (previewing Module 09, but on an ordinary — not fostered —
// insertion, since foster parenting doesn't exist in the engine until Module 02+).
const doc = new DocumentNode();
const div = insertNode(doc, new ElementNode('div'));
div.attrs.set('class', 'a');
const p = insertNode(div, new ElementNode('p'));

// Three separate character tokens ('h','i',' ') should fuse into ONE TextNode, because
// each insertion checks tryFuseCharacter before creating a new node — exactly what
// "insert a character" step 4 does in the real spec.
for (const ch of ['h', 'i', ' ']) {
  if (!tryFuseCharacter(p, ch)) {
    insertNode(p, new TextNode(ch));
  }
}

const b = insertNode(p, new ElementNode('b'));
for (const ch of ['t', 'h', 'e', 'r', 'e']) {
  if (!tryFuseCharacter(b, ch)) {
    insertNode(b, new TextNode(ch));
  }
}

console.log('\n── Rendered tree ──');
const treeLines = renderTree(doc);
console.log(treeLines.join('\n'));

// ── Part 3: verify, don't just print. ──
assert.equal(p.children.length, 2, 'p should have exactly 2 children: one fused text node, then <b>');
assert.ok(p.children[0] instanceof TextNode, 'first child of p should be a TextNode');
assert.equal(p.children[0].data, 'hi ', 'three character tokens should fuse into one TextNode with data "hi "');
assert.equal(p.children[1], b, 'second child of p should be the <b> element, same object identity');
assert.equal(b.children.length, 1, 'b should have exactly 1 (fused) text child');
assert.equal(b.children[0].data, 'there', 'five character tokens should fuse into one TextNode with data "there"');
assert.equal(div.attrs.get('class'), 'a', 'div should carry the class="a" attribute read from its start tag');

const expectedTree = [
  '#document',
  '└─ div',
  '   └─ p',
  '      ├─ #text "hi "',
  '      └─ b',
  '         └─ #text "there"',
].join('\n');
assert.equal(treeLines.join('\n'), expectedTree, 'rendered tree must match the exact expected ASCII shape');

console.log('\nOK — all assertions passed. Module 00 data structures verified.');
