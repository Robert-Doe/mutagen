'use strict';

const assert = require('node:assert/strict');
const { tokenize } = require('../../01_stack_and_dispatch/src/tokenizer.js');
const { NotImplementedYet } = require('../../01_stack_and_dispatch/src/dispatch.js');
const { ElementNode, TextNode, CommentNode, DocumentFragmentNode } = require('../../00_tokens_and_nodes/src/nodes.js');
const { dispatch11, createParserState11 } = require('../src/dispatch11.js');
const { parseFragment } = require('../src/fragment.js');

function serializeLikeBrowser(node, depth = 0, out = []) {
  const indent = '  '.repeat(depth);
  if (node instanceof DocumentFragmentNode) out.push(indent + '#document-fragment');
  else if (node instanceof ElementNode) out.push(indent + node.tagName);
  else if (node instanceof TextNode) out.push(indent + '#text ' + JSON.stringify(node.data));
  else if (node instanceof CommentNode) out.push(indent + '#comment ' + JSON.stringify(node.data));
  const kids = node.content ? node.content.children : node.children;
  for (const child of kids || []) serializeLikeBrowser(child, depth + 1, out);
  return out;
}

function runDocumentParse(html) {
  const tokens = tokenize(html);
  const state = createParserState11();
  for (const token of tokens) {
    try {
      dispatch11(token, state, () => {});
    } catch (err) {
      if (err instanceof NotImplementedYet) break;
      throw err;
    }
  }
  const htmlEl = state.document.children.find((c) => c.tagName === 'html');
  return htmlEl.children.find((c) => c.tagName === 'body');
}

// ── Case 1: the innerHTML-vs-document-parse inversion ──
console.log('── Case 1: the same markup, two routes, opposite results ──\n');

const bodyDoc = runDocumentParse('<!DOCTYPE html><head></head><body><table><p>x</p></table></body>');
const treeDoc = serializeLikeBrowser(bodyDoc).join('\n');
console.log('Parsed as a document: <table><p>x</p></table>');
console.log(treeDoc, '\n');
assert.equal(treeDoc, ['body', '  p', '    #text "x"', '  table'].join('\n'), 'document parse: <p> must be fostered OUTSIDE the table');

const fragmentChildren = parseFragment('<p>x</p>', 'table', dispatch11);
const table = new ElementNode('table');
table.children = fragmentChildren;
const treeFrag = serializeLikeBrowser(table).join('\n');
console.log("Set via table.innerHTML = '<p>x</p>':");
console.log(treeFrag, '\n');
assert.equal(treeFrag, ['table', '  p', '    #text "x"'].join('\n'), 'fragment parse: <p> must land INSIDE the table');

console.log('Same markup. Opposite outcome. "Where does a <p> in a table end up?" has no answer until you');
console.log('say how it got there.\n');

// ── Case 2: substep 4, the fragment case, genuinely firing ──
console.log('── Case 2: substep 4 (no table on the stack) genuinely firing ──\n');

const fragmentChildren2 = parseFragment('<tr>FOO', 'table', dispatch11);
const table2 = new ElementNode('table');
table2.children = fragmentChildren2;
const treeFrag2 = serializeLikeBrowser(table2).join('\n');
console.log("Set via table.innerHTML = '<tr>FOO':");
console.log(treeFrag2, '\n');
assert.equal(
  treeFrag2,
  ['table', '  tbody', '    tr', '  #text "FOO"'].join('\n'),
  'FOO must foster to the fragment root level (sibling of tbody), not inside the empty <tr>'
);

// ── Case 3: template intercepts fostered content into its own contents ──
console.log('── Case 3: a <template> intercepts fostered content ──\n');

const bodyT1 = runDocumentParse('<!DOCTYPE html><head></head><body><table><template><p>a</p></template></table></body>');
const treeT1 = serializeLikeBrowser(bodyT1).join('\n');
console.log('<table><template><p>a</p></template></table>');
console.log(treeT1, '\n');
assert.equal(
  treeT1,
  ['body', '  table', '    template', '      p', '        #text "a"'].join('\n'),
  '<p> must land inside the template\'s .content, not fostered before the table'
);

// ── Case 4: substep 1 — foster parenting redirects into a template deeper than the last table ──
console.log('── Case 4: substep 1 — fostering redirects into a <template> nested inside a table ──\n');

const bodyT2 = runDocumentParse('<!DOCTYPE html><head></head><body><table><template><tbody>FOO</template></table></body>');
const treeT2 = serializeLikeBrowser(bodyT2).join('\n');
console.log('<table><template><tbody>FOO</template></table>');
console.log(treeT2, '\n');
assert.equal(
  treeT2,
  ['body', '  table', '    template', '      tbody', '      #text "FOO"'].join('\n'),
  'FOO must land in the template\'s .content (as tbody\'s sibling), NOT fostered before the outer table'
);

console.log('OK — all assertions passed. Module 11 templates/fragments/substep-1/substep-4 verified against real browser output.');
