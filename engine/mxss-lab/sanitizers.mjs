// engine/mxss-lab/sanitizers.mjs
//
// The three sanitizers this course builds and attacks:
//   regexSanitizer(html)      — Module 3 sidebar: a string filter. Bypassable by design.
//   domSanitizer(html, opts)  — Modules 3–7: parse → walk an allow-list → serialize.
//                                "Correct" for the tree it sees. Every attack module
//                                defeats THIS one via a mutation it never sees.
//   hardenedSanitizer(html)   — Module 8: domSanitizer + the round-trip loop + namespace
//                                enforcement + <template> unwrap + forbidden-element list.
//
// All three are deliberately small enough to read in full.

import { parseFragment, serialize, HTML, SVG, MATHML } from './lab.mjs';

// ── a small, sane allow-list ────────────────────────────────────────
export const DEFAULT_ALLOW = {
  elements: new Set(['a', 'b', 'i', 'em', 'strong', 'p', 'br', 'span', 'div',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'h1', 'h2', 'h3', 'img',
    'table', 'thead', 'tbody', 'tr', 'td', 'th', 'title', 'textarea', 'style']),
  attributes: new Set(['href', 'src', 'alt', 'title', 'class', 'colspan', 'rowspan']),
};

const DANGEROUS_URI = /^\s*(javascript|data|vbscript):/i;

// ════════════════════════════════════════════════════════════════════
// 1. the regex sanitizer — a string filter, no parser
// ════════════════════════════════════════════════════════════════════
export function regexSanitizer(html) {
  return String(html)
    .replace(/<\s*script\b[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*\/?\s*(script|iframe|object|embed|link|meta)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '$1="#"');
}

// ════════════════════════════════════════════════════════════════════
// 2. the DOM-walking allow-list sanitizer — the "right" way
// ════════════════════════════════════════════════════════════════════
export function domSanitizer(html, {
  allow = DEFAULT_ALLOW,
  contextTag = 'body',
  keepChildrenOfRemoved = true,
} = {}) {
  const tree = parseFragment(html, contextTag, { scripting: false });
  clean(tree);
  return serialize(tree);

  function clean(node) {
    const kids = node.content ? node.content.children : node.children;
    const out = [];
    for (const child of kids) {
      if (child.type === 'text' || child.type === 'comment') {
        if (child.type === 'comment') continue;       // drop comments
        out.push(child);
        continue;
      }
      // element
      const name = child.name.toLowerCase();
      const allowed = allow.elements.has(name) && child.ns === HTML;
      if (!allowed) {
        // remove the element; optionally keep its (already-cleaned) children
        if (keepChildrenOfRemoved) {
          clean(child);
          const gk = child.content ? child.content.children : child.children;
          for (const g of gk) { g.parent = node; out.push(g); }
        }
        continue;
      }
      // keep it — scrub attributes
      child.attrs = child.attrs.filter(([k, v]) => {
        const kk = k.toLowerCase();
        if (kk.startsWith('on')) return false;
        if (!allow.attributes.has(kk)) return false;
        if ((kk === 'href' || kk === 'src') && DANGEROUS_URI.test(v)) return false;
        return true;
      });
      clean(child);
      out.push(child);
    }
    if (node.content) node.content.children = out; else node.children = out;
  }
}

// ════════════════════════════════════════════════════════════════════
// 3. the hardened sanitizer — Module 8
// ════════════════════════════════════════════════════════════════════
export function hardenedSanitizer(html, opts = {}) {
  const max = opts.max ?? 6;
  let cur = String(html);
  for (let i = 0; i < max; i++) {
    const next = onePass(cur, opts);
    if (next === cur) return next;          // fixed point reached — safe to ship
    cur = next;
  }
  throw new Error('hardenedSanitizer: no fixed point after ' + max + ' passes — rejecting input');
}

function onePass(html, { allow = DEFAULT_ALLOW, contextTag = 'body' } = {}) {
  const tree = parseFragment(html, contextTag, { scripting: false });
  hard(tree);
  return serialize(tree);

  function hard(node) {
    const kids = node.content ? node.content.children : node.children;
    const out = [];
    for (const child of kids) {
      if (child.type === 'comment') continue;
      if (child.type === 'text') { out.push(child); continue; }
      const name = child.name.toLowerCase();

      // (a) forbidden outright — known mutation vectors, dropped WITH their subtree
      if (['style', 'script', 'xmp', 'noscript', 'noembed', 'noframes',
           'iframe', 'title', 'textarea', 'template', 'mglyph', 'malignmark',
           'annotation-xml'].includes(name)) {
        continue;
      }
      // (b) namespace must be HTML — no SVG/MathML elements survive
      if (child.ns !== HTML) continue;
      // (c) not on the allow-list → unwrap (keep cleaned children)
      if (!allow.elements.has(name) || name === 'style' || name === 'title' || name === 'textarea') {
        hard(child);
        for (const g of (child.content ? child.content.children : child.children)) {
          g.parent = node; out.push(g);
        }
        continue;
      }
      // (d) keep, scrub attributes hard
      child.attrs = child.attrs.filter(([k, v]) => {
        const kk = k.toLowerCase();
        if (kk.startsWith('on')) return false;
        if (kk === 'style') return false;
        if (!allow.attributes.has(kk)) return false;
        if ((kk === 'href' || kk === 'src') && DANGEROUS_URI.test(v)) return false;
        return true;
      });
      hard(child);
      out.push(child);
    }
    if (node.content) node.content.children = out; else node.children = out;
  }
}
