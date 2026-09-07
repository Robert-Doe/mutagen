// Module 1 — Foreign Content & the Fragment Parser
//
// This module owns the foreign-content parts of engine/mxss-lab/lab.mjs:
//   • parseFragment(html, contextTag, opts) — the context element seeds the mode
//   • the <svg>/<math> namespace switch
//   • integration points (content parses as HTML)
//   • breakout tags (pop back to HTML)
//   • CDATA (text in foreign content, comment in HTML)
//
// Nothing new is implemented here — the engine already does it. This file gives
// the module small, named entry points so the tutorial and the tests can talk
// about one behaviour at a time, and re-exports the pieces Module 5 builds on.

import {
  parseFragment, parseDocument, serialize, treeString,
  HTML, SVG, MATHML, El, Txt,
} from '../../../engine/mxss-lab/lab.mjs';

export { parseFragment, parseDocument, serialize, treeString, HTML, SVG, MATHML };

// Walk the tree and collect (name, namespace) for every element — the single
// most useful view when reasoning about namespace confusion.
export function nsMap(node, acc = []) {
  const kids = node.content ? node.content.children : (node.children || []);
  for (const c of kids) {
    if (c.type === 'element') {
      acc.push({ name: c.name, ns: nsShort(c.ns) });
      nsMap(c, acc);
    }
  }
  return acc;
}
export function nsShort(ns) {
  return ns === SVG ? 'svg' : ns === MATHML ? 'math' : 'html';
}

// Does the tree contain a live <img> (or <image>) with an on* handler attribute?
// This is the "did a payload survive" probe the attack modules reuse.
export function hasLiveHandler(node) {
  const kids = node.content ? node.content.children : (node.children || []);
  for (const c of kids) {
    if (c.type === 'element') {
      if (c.attrs.some(([k]) => /^on/i.test(k))) return true;
      if (hasLiveHandler(c)) return true;
    }
  }
  return false;
}

// The "context element" of a fragment parse, made explicit. Setting
// element.innerHTML = str parses `str` as if it were the contents of `element`.
// The context element decides the starting insertion mode — and can drop the
// parser straight into rawtext (<style>), RCDATA (<textarea>), a table, or a
// foreign namespace (<svg>) before a single character of `str` is read.
export function innerHTMLModel(contextTag, str, opts = {}) {
  return parseFragment(str, contextTag, opts);
}
