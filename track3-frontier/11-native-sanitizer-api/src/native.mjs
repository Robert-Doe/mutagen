// Module 11 — The Native Sanitizer API: Does the Platform Fix Hold?
//
// Element.setHTML(str, {sanitizer}) — shipping in Chrome 148 — is mutation-safe
// BY CONSTRUCTION: it parses `str` ONCE, filters the resulting tree against an
// allow-list, and inserts the nodes directly. There is no serialize step, so
// there is no second parse for a sink-differential (Module 9) to exploit.
//
// This file models that shape and contrasts it with the parse→serialize→parse
// sanitizers of Track 2.

import { parseFragment, serialize, hasLiveHandler, elementNames, HTML }
  from '../../../engine/mxss-lab/lab.mjs';

export { parseFragment, serialize, hasLiveHandler, elementNames };

// Model of Element.setHTML: parse once (scripting ON — it's a live element),
// filter the tree, INSERT (no re-serialize). We return the filtered tree; a real
// setHTML would attach it. The key property: the thing that ends up in the DOM
// is the thing the filter inspected — same tree, no round trip.
const DEFAULT_SAFE = {
  elements: new Set(['a', 'b', 'i', 'em', 'strong', 'p', 'br', 'span', 'div', 'ul',
    'ol', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr']),
  attributes: new Set(['href', 'src', 'alt', 'title', 'colspan', 'rowspan']),
};

export function setHTMLModel(html, safe = DEFAULT_SAFE) {
  const tree = parseFragment(html, 'div', { scripting: true });   // ONE parse, live context
  filterInPlace(tree, safe);
  return tree;                                                    // inserted as-is; NOT serialized

  function filterInPlace(node, safe) {
    const kids = node.content ? node.content.children : node.children;
    const out = [];
    for (const c of kids) {
      if (c.type === 'comment') continue;
      if (c.type === 'text') { out.push(c); continue; }
      const name = c.name.toLowerCase();
      // namespace + allow-list; unknown/foreign → unwrap (keep filtered children)
      if (c.ns !== HTML || !safe.elements.has(name)) {
        filterInPlace(c, safe);
        for (const g of (c.content ? c.content.children : c.children)) { g.parent = node; out.push(g); }
        continue;
      }
      c.attrs = c.attrs.filter(([k, v]) => {
        const kk = k.toLowerCase();
        if (kk.startsWith('on')) return false;
        if (!safe.attributes.has(kk)) return false;
        if ((kk === 'href' || kk === 'src') && /^\s*(javascript|data|vbscript):/i.test(v)) return false;
        return true;
      });
      filterInPlace(c, safe);
      out.push(c);
    }
    if (node.content) node.content.children = out; else node.children = out;
  }
}

// setHTMLUnsafe / parseHTMLUnsafe — the escape hatches. They parse but do NOT
// sanitize (they DO still block script execution during parse). Modeled as
// "parse once, no filter" — safe against mXSS-the-mutation, NOT against a plain
// <img onerror> that the caller forgot to handle.
export function setHTMLUnsafeModel(html) {
  return parseFragment(html, 'div', { scripting: true });
}

// Is the result of setHTMLModel free of live handlers? (It should always be —
// there is no round trip to reintroduce one.)
export function isClean(tree) { return !hasLiveHandler(tree); }
