// Module 7 — mXSS via <template> Reparenting
//
// <template>'s content is parsed into a separate, inert DocumentFragment. A
// sanitizer that walks node.children misses it entirely (template.children is
// empty; the real content is template.content.children). When the app later
// does  target.append(template.content)  or  target.innerHTML = template.innerHTML,
// everything the sanitizer skipped goes live.

import { parseFragment, serialize, treeString, elementNames, hasLiveHandler }
  from '../../../engine/mxss-lab/lab.mjs';

export { parseFragment, serialize, treeString, elementNames, hasLiveHandler };

// A sanitizer that FORGETS template content (walks .children only).
export function forgetfulSanitize(html, allow = new Set(['a', 'b', 'i', 'p', 'br', 'span', 'div', 'img', 'template', 'ul', 'li'])) {
  const tree = parseFragment(html, 'body', { scripting: false });
  walk(tree);
  return serialize(tree);
  function walk(node) {
    const kids = node.children;                       // <-- NOT node.content.children
    const out = [];
    for (const c of kids) {
      if (c.type === 'comment') continue;
      if (c.type === 'text') { out.push(c); continue; }
      if (!allow.has(c.name.toLowerCase())) {
        for (const g of c.children) { g.parent = node; out.push(g); }   // also misses .content
        continue;
      }
      c.attrs = c.attrs.filter(([k]) => !/^on/i.test(k));
      walk(c);                                        // for <template> this recurses into EMPTY .children
      out.push(c);
    }
    node.children = out;
  }
}

// A sanitizer that DESCENDS into template content.
export function thoroughSanitize(html, allow = new Set(['a', 'b', 'i', 'p', 'br', 'span', 'div', 'img', 'ul', 'li'])) {
  const tree = parseFragment(html, 'body', { scripting: false });
  walk(tree);
  return serialize(tree);
  function walk(node) {
    const kids = node.content ? node.content.children : node.children;   // <-- handles .content
    const out = [];
    for (const c of kids) {
      if (c.type === 'comment') continue;
      if (c.type === 'text') { out.push(c); continue; }
      const name = c.name.toLowerCase();
      if (name === 'template') {                       // unwrap template: hoist its cleaned content
        walk(c);
        for (const g of c.content.children) { g.parent = node; out.push(g); }
        continue;
      }
      if (c.ns !== 'http://www.w3.org/1999/xhtml' || !allow.has(name)) {
        walk(c);
        for (const g of (c.content ? c.content.children : c.children)) { g.parent = node; out.push(g); }
        continue;
      }
      c.attrs = c.attrs.filter(([k]) => !/^on/i.test(k));
      walk(c);
      out.push(c);
    }
    if (node.content) node.content.children = out; else node.children = out;
  }
}

// The scenario: sanitize, then the app EXTRACTS template content into the live DOM.
export function sanitizeThenExtractTemplate(html, sanitizer) {
  const cleaned = sanitizer(html);
  // model  const t = box.querySelector('template'); target.innerHTML = t.innerHTML
  const box = parseFragment(cleaned, 'body', { scripting: true });
  const tpl = findTemplate(box);
  const extracted = tpl ? serialize(tpl) : cleaned;   // t.innerHTML  (the fragment's serialization)
  const finalTree = parseFragment(extracted, 'body', { scripting: true });
  return { cleaned, extracted, live: hasLiveHandler(finalTree) };
}
function findTemplate(node) {
  for (const c of (node.content ? node.content.children : node.children || [])) {
    if (c.type === 'element') {
      if (c.name.toLowerCase() === 'template') return c;
      const inner = findTemplate(c);
      if (inner) return inner;
    }
  }
  return null;
}
