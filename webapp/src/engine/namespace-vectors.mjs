// PROVENANCE: adapted from ../../../track2-mxss/05-mxss-namespace/src/namespace.mjs
// (Module 5 — mXSS via Namespace Confusion). Logic is verbatim; only the two
// relative import paths were repointed to the copies of the engine that ship
// with this webapp (../../../engine/mxss-lab/* -> ./lab.mjs, ./sanitizers.mjs).
// This is the module whose "image alias" vector the webapp's demo uses as its
// default payload — verified (track2-mxss/05-mxss-namespace/test/demo.mjs,
// 2026-09-07, Chrome 148) to make naiveSanitize's output live on reparse and
// correctSanitize's output NOT live.
//
// Module 5 — mXSS via Namespace Confusion (SVG / MathML)
// The DOMPurify bypass family. Verified against Chrome 148: these defeat a
// sanitizer that (a) iterates a live child list while removing nodes, (b) skips
// the namespace check, or (c) forgets <image> ≡ <img>. A correct sanitizer
// (snapshot iteration + namespace enforcement) blocks them.

import { parseFragment, serialize, treeString, elementNames, hasLiveHandler, HTML }
  from './lab.mjs';
import { domSanitizer } from './sanitizers.mjs';

export { parseFragment, serialize, treeString, elementNames, hasLiveHandler, domSanitizer };

// The catalogue. Each entry: name, payload, and the flaw it exploits.
export const VECTORS = [
  { name: 'form double-nest',
    payload: '<form><math><mtext></form><form><img src=x onerror=alert(1)></form>',
    flaw: 'the second <form> is dropped by "form-in-form", reparenting the <img> past a live iterator' },
  { name: 'mtext/mglyph/style',
    payload: '<math><mtext><mglyph><style><img src=x onerror=alert(1)></style></mglyph></mtext></math>',
    flaw: '<mglyph> keeps us in MathML, so <style> is not rawtext and <img> is a real child that broke out of it' },
  { name: 'image alias',
    payload: '<svg><image href=x onerror=alert(1)></svg>',
    flaw: 'HTML parses <image> as <img>; a name-based allow-list that lists "img" but not "image" lets it through' },
  { name: 'svg p breakout',
    payload: '<svg><p><style><a id="</style><img src=x onerror=alert(1)>"></a></style></svg>',
    flaw: '<p> ejects <svg>; the surviving HTML <style> serialises its text raw; </style> in it breaks out on reparse' },
];

// A NAIVE sanitizer with two real, common bugs:
//   1. it iterates the child array with `for…of` while splicing it (the classic
//      "mutating the collection you're iterating" bug — the spliced-in unwrapped
//      children are skipped by the iterator),
//   2. it has no namespace check — an element is judged by tag name alone.
// This is a faithful model of sanitizers that walk `node.childNodes` (a live
// NodeList) and call `.replaceWith(...children)` mid-walk.
export function naiveSanitize(html, allow = new Set(['a', 'b', 'i', 'p', 'br', 'span', 'div', 'img', 'form', 'table', 'tr', 'td'])) {
  const tree = parseFragment(html, 'body', { scripting: false });
  walk(tree);
  return serialize(tree);

  function walk(node) {
    const kids = node.content ? node.content.children : node.children;
    for (const child of kids) {                      // BUG 1: iterating while we splice below
      if (child.type !== 'element') continue;
      const name = child.name.toLowerCase();
      if (!allow.has(name)) {                        // BUG 2: no ns check
        const i = kids.indexOf(child);
        if (i === -1) continue;
        const gk = [...(child.content ? child.content.children : child.children)];
        kids.splice(i, 1, ...gk);                    // unwrap — the new gk items are SKIPPED by for…of
        for (const g of gk) g.parent = node;
        continue;
      }
      child.attrs = child.attrs.filter(([k]) => !/^on/i.test(k));
      walk(child);
    }
  }
}

// A CORRECT sanitizer: snapshot the child list, enforce HTML namespace,
// normalise <image> → <img>. (This is what domSanitizer already does; wrapped
// here with the <image> fix so the module can compare like-for-like.)
export function correctSanitize(html) {
  const allow = { elements: new Set(['a', 'b', 'i', 'p', 'br', 'span', 'div', 'img', 'form', 'table', 'tr', 'td']),
    attributes: new Set(['href', 'src', 'alt', 'title']) };
  // normalise the <image> alias before the walk
  const tree = parseFragment(html, 'body', { scripting: false });
  renameImage(tree);
  return domSanitizerOnTree(tree, allow);

  function renameImage(node) {
    for (const c of (node.content ? node.content.children : node.children || [])) {
      if (c.type === 'element') {
        if (c.name.toLowerCase() === 'image') { c.name = 'img'; c.ns = HTML; }
        renameImage(c);
      }
    }
  }
}
function domSanitizerOnTree(tree, allow) {
  clean(tree);
  return serialize(tree);
  function clean(node) {
    const snapshot = [...(node.content ? node.content.children : node.children)];  // <-- snapshot
    const out = [];
    for (const child of snapshot) {
      if (child.type === 'comment') continue;
      if (child.type === 'text') { out.push(child); continue; }
      const name = child.name.toLowerCase();
      if (child.ns !== HTML || !allow.elements.has(name)) {           // <-- namespace enforced
        clean(child);
        for (const g of (child.content ? child.content.children : child.children)) { g.parent = node; out.push(g); }
        continue;
      }
      child.attrs = child.attrs.filter(([k, v]) => !/^on/i.test(k) && allow.attributes.has(k.toLowerCase()));
      clean(child);
      out.push(child);
    }
    if (node.content) node.content.children = out; else node.children = out;
  }
}

export function report(vector) {
  const naive = naiveSanitize(vector.payload);
  const correct = correctSanitize(vector.payload);
  const live = s => hasLiveHandler(parseFragment(s, 'body', { scripting: true }));
  return {
    name: vector.name, flaw: vector.flaw,
    naive: { out: naive, live: live(naive) },
    correct: { out: correct, live: live(correct) },
  };
}
