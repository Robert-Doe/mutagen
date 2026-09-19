// PROVENANCE: copied verbatim from ../../../engine/mxss-lab/lab.mjs (the
// course's real, cross-checked-against-Chrome-148 HTML engine). No logic
// changed — this file is reused, not reimplemented, for the webapp demo.
// ══════════════════════════════════════════════════════════════════════
// engine/mxss-lab/lab.mjs — the from-scratch HTML engine this course builds on
//
// This is NOT a spec-complete HTML parser. It is the smallest engine that
// correctly reproduces the handful of behaviours mutation XSS actually turns
// on:
//   • RAWTEXT / RCDATA elements  (Module 3)
//   • the scripting flag and <noscript>  (Module 4)
//   • foreign content: <svg>/<math>, integration points, breakout tags  (Module 1, 5)
//   • <template> content going into a separate fragment  (Module 7)
//   • character-reference decoding in the contexts that decode  (Module 6)
//   • the innerHTML *getter* serialization algorithm, WHATWG §13.3  (Module 2)
//
// Every behaviour here is cross-checked against a real browser (Chrome 148,
// DOMParser + live innerHTML) in each module's proof.html. Where this engine
// and the browser disagree, the browser wins and the module says so.
//
// Public API:
//   parseDocument(html, {scripting=false})        -> {root}
//   parseFragment(html, contextTag, {scripting})  -> DocumentFragment-like node
//   serialize(node)                                -> string  (the innerHTML getter)
//   roundTrip(html, {contextTag, scripting, max})  -> {steps, stable, iterations}
//   treeString(node)                               -> ASCII tree for tutorials
// ══════════════════════════════════════════════════════════════════════

'use strict';

// ── namespaces ────────────────────────────────────────────────────────
export const HTML = 'http://www.w3.org/1999/xhtml';
export const SVG = 'http://www.w3.org/2000/svg';
export const MATHML = 'http://www.w3.org/1998/Math/MathML';

// ── node shapes (parallel to the browser's, minimal) ──────────────────
export class El {
  constructor(name, ns = HTML) {
    this.type = 'element';
    this.name = name;
    this.ns = ns;
    this.attrs = [];              // [ [name, value], ... ] first-wins
    this.children = [];
    this.parent = null;
    this.content = null;          // for <template>: a Frag
  }
  attr(n) { const p = this.attrs.find(([k]) => k === n); return p ? p[1] : null; }
}
export class Txt {
  constructor(data) { this.type = 'text'; this.data = data; this.parent = null; }
}
export class Comment {
  constructor(data) { this.type = 'comment'; this.data = data; this.parent = null; }
}
export class Frag {
  constructor() { this.type = 'fragment'; this.children = []; this.parent = null; }
}

function kidsArray(parent) {
  return parent.content ? parent.content.children : parent.children;
}
function append(parent, node) {
  node.parent = parent;
  kidsArray(parent).push(node);
  return node;
}

// ── element classification ───────────────────────────────────────────
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

// HTML content-model: which elements switch the tokenizer to a text mode
const RAWTEXT = new Set(['style', 'script', 'xmp', 'iframe', 'noembed', 'noframes']);
const RCDATA = new Set(['title', 'textarea']);

// foreign content: start tags that force the parser OUT of foreign content
// (subset of the spec list — the ones payloads use). WHATWG §13.2.6.5.
const BREAKOUT = new Set(['b', 'big', 'blockquote', 'body', 'br', 'center', 'code',
  'dd', 'div', 'dl', 'dt', 'em', 'embed', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'head', 'hr', 'i', 'img', 'li', 'listing', 'menu', 'meta', 'nobr', 'ol', 'p',
  'pre', 'ruby', 's', 'small', 'span', 'strong', 'strike', 'sub', 'sup', 'table',
  'tt', 'u', 'ul', 'var', 'font']);

// integration points: foreign elements whose *content* parses as HTML
const SVG_HTML_INTEGRATION = new Set(['foreignobject', 'desc', 'title']);
const MATHML_TEXT_INTEGRATION = new Set(['mi', 'mo', 'mn', 'ms', 'mtext']);

// SVG names that get case-corrected on entry (subset)
const SVG_CASE = { foreignobject: 'foreignObject', clippath: 'clipPath',
  lineargradient: 'linearGradient', radialgradient: 'radialGradient',
  textpath: 'textPath' };

// ── character references ─────────────────────────────────────────────
const NAMED = {
  'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'",
  'nbsp': ' ', 'copy': '©', 'AMP': '&', 'LT': '<', 'GT': '>',
  'QUOT': '"', 'sol': '/', 'colon': ':', 'NewLine': '\n', 'Tab': '\t',
  'lpar': '(', 'rpar': ')', 'grave': '`', 'equals': '=',
};
export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);?/g, (m, body) => {
    if (body[0] === '#') {
      let cp = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff) return m;
      try { return String.fromCodePoint(cp); } catch { return m; }
    }
    if (Object.prototype.hasOwnProperty.call(NAMED, body)) return NAMED[body];
    return m; // unknown named ref: leave as-is (matches "no match" behaviour closely enough)
  });
}

// ══════════════════════════════════════════════════════════════════════
// TOKENIZER — small, mode-aware
// ══════════════════════════════════════════════════════════════════════
function* tokenize(html, startMode = 'data', startTag = null) {
  let i = 0;
  const n = html.length;
  let mode = startMode;          // 'data' | 'rawtext' | 'rcdata'
  let rawTag = startTag;         // tag name whose close ends rawtext/rcdata

  while (i < n) {
    if (mode === 'rawtext' || mode === 'rcdata') {
      const close = new RegExp(`</${rawTag}[\\s/>]`, 'i');
      const rest = html.slice(i);
      const m = rest.match(close);
      let text, consumed;
      if (m) { text = rest.slice(0, m.index); consumed = m.index; }
      else { text = rest; consumed = rest.length; }
      if (text) yield { t: 'char', data: mode === 'rcdata' ? decodeEntities(text) : text };
      i += consumed;
      if (m) {
        const end = html.indexOf('>', i);
        yield { t: 'end', name: rawTag.toLowerCase() };
        i = end === -1 ? n : end + 1;
      }
      mode = 'data'; rawTag = null;
      continue;
    }

    if (html[i] !== '<') {
      const j = html.indexOf('<', i);
      const end = j === -1 ? n : j;
      yield { t: 'char', data: decodeEntities(html.slice(i, end)) };
      i = end;
      continue;
    }

    // '<' ...
    if (html.startsWith('<!--', i)) {
      const close = html.indexOf('-->', i + 4);
      const stop = close === -1 ? n : close;
      yield { t: 'comment', data: html.slice(i + 4, stop) };
      i = close === -1 ? n : close + 3;
      continue;
    }
    if (html.startsWith('<![CDATA[', i)) {
      const close = html.indexOf(']]>', i + 9);
      const stop = close === -1 ? n : close;
      yield { t: 'cdata', data: html.slice(i + 9, stop) };
      i = close === -1 ? n : close + 3;
      continue;
    }
    if (/^<!doctype/i.test(html.slice(i, i + 9))) {
      const close = html.indexOf('>', i);
      yield { t: 'doctype' };
      i = close === -1 ? n : close + 1;
      continue;
    }
    if (html[i + 1] === '/') {
      const close = html.indexOf('>', i);
      const stop = close === -1 ? n : close;
      const name = html.slice(i + 2, stop).trim().split(/[\s/]/)[0].toLowerCase();
      yield { t: 'end', name };
      i = close === -1 ? n : close + 1;
      continue;
    }
    if (/[a-zA-Z]/.test(html[i + 1] || '')) {
      const close = findTagEnd(html, i);
      const raw = html.slice(i + 1, close);
      const tok = parseStartTag(raw);
      yield tok;
      i = (html[close] === '>') ? close + 1 : close;
      // enter rawtext/rcdata if applicable (caller decides based on namespace)
      if (tok.enterRawtextEligible && !tok.selfClosing) {
        // signal handled by tree builder via a callback? simpler: tree builder
        // re-tokenizes. Here we just mark; builder calls tokenizeFrom.
      }
      continue;
    }
    yield { t: 'char', data: '<' };
    i += 1;
  }
}

function findTagEnd(html, start) {
  let i = start + 1, q = null;
  while (i < html.length) {
    const c = html[i];
    if (q) { if (c === q) q = null; }
    else if (c === '"' || c === "'") q = c;
    else if (c === '>') return i;
    i++;
  }
  return html.length;
}

function parseStartTag(raw) {
  let body = raw, selfClosing = false;
  if (body.trimEnd().endsWith('/')) { selfClosing = true; body = body.trimEnd().slice(0, -1); }
  const sp = body.search(/\s/);
  const name = (sp === -1 ? body : body.slice(0, sp)).trim().toLowerCase();
  const attrSrc = sp === -1 ? '' : body.slice(sp);
  const attrs = [];
  const re = /([^\s="'>/]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s"'=<>`]+))?/g;
  let m;
  while ((m = re.exec(attrSrc))) {
    const an = m[1].toLowerCase();
    let av = m[3] ?? m[4] ?? (m[2] ?? '');
    av = decodeEntities(av);   // attribute values decode entities
    if (!attrs.some(([k]) => k === an)) attrs.push([an, av]);
  }
  return { t: 'start', name, attrs, selfClosing };
}

// ══════════════════════════════════════════════════════════════════════
// TREE BUILDER — enough insertion logic for the mXSS constructs
// ══════════════════════════════════════════════════════════════════════
function build(html, { scripting = false, fragmentContext = null } = {}) {
  const root = fragmentContext ? new Frag() : new El('#root');
  const stack = [root];                 // open elements; [0] is root
  const nsStack = [HTML];               // parallel namespace context
  const top = () => stack[stack.length - 1];
  const curNs = () => nsStack[nsStack.length - 1];

  // fragment: if context is svg/math or a rawtext/rcdata element, seed mode
  let seedMode = 'data', seedTag = null;
  if (fragmentContext) {
    const c = fragmentContext.toLowerCase();
    if (RAWTEXT.has(c)) { seedMode = 'rawtext'; seedTag = c; }
    else if (RCDATA.has(c)) { seedMode = 'rcdata'; seedTag = c; }
    else if (c === 'svg') nsStack.push(SVG);
    else if (c === 'math') nsStack.push(MATHML);
  }

  let src = html;
  let cursor = 0;

  // We drive tokenization ourselves so the tree builder can switch the
  // tokenizer into rawtext/rcdata right after inserting the element —
  // exactly what the real spec's tree construction stage does.
  function run() {
    let mode = seedMode, rawTag = seedTag;
    while (cursor < src.length) {
      if (mode === 'rawtext' || mode === 'rcdata') {
        const rest = src.slice(cursor);
        const m = rest.match(new RegExp(`</${rawTag}[\\s/>]`, 'i'));
        const text = m ? rest.slice(0, m.index) : rest;
        if (text) insertText(mode === 'rcdata' ? decodeEntities(text) : text);
        cursor += m ? m.index : rest.length;
        if (m) { const g = src.indexOf('>', cursor); popByName(rawTag); cursor = g === -1 ? src.length : g + 1; }
        mode = 'data'; rawTag = null;
        continue;
      }
      const ch = src[cursor];
      if (ch !== '<') {
        const j = src.indexOf('<', cursor);
        const end = j === -1 ? src.length : j;
        insertText(decodeEntities(src.slice(cursor, end)));
        cursor = end;
        continue;
      }
      if (src.startsWith('<!--', cursor)) {
        const c = src.indexOf('-->', cursor + 4);
        append(top(), new Comment(src.slice(cursor + 4, c === -1 ? src.length : c)));
        cursor = c === -1 ? src.length : c + 3;
        continue;
      }
      if (src.startsWith('<![CDATA[', cursor)) {
        const c = src.indexOf(']]>', cursor + 9);
        const data = src.slice(cursor + 9, c === -1 ? src.length : c);
        // CDATA is text in foreign content; bogus comment in HTML
        if (curNs() !== HTML) insertText(data);
        else append(top(), new Comment('[CDATA[' + data + ']]'));
        cursor = c === -1 ? src.length : c + 3;
        continue;
      }
      if (/^<!doctype/i.test(src.slice(cursor, cursor + 9))) {
        const g = src.indexOf('>', cursor); cursor = g === -1 ? src.length : g + 1; continue;
      }
      if (src[cursor + 1] === '/') {
        const g = src.indexOf('>', cursor);
        const name = src.slice(cursor + 2, g === -1 ? src.length : g).trim().split(/[\s/]/)[0].toLowerCase();
        popByName(name);
        cursor = g === -1 ? src.length : g + 1;
        continue;
      }
      if (/[a-zA-Z]/.test(src[cursor + 1] || '')) {
        const close = findTagEnd(src, cursor);
        const tok = parseStartTag(src.slice(cursor + 1, close));
        cursor = (src[close] === '>') ? close + 1 : close;
        const entered = insertStart(tok);
        if (entered) { mode = entered.mode; rawTag = entered.rawTag; }
        continue;
      }
      insertText('<');
      cursor += 1;
    }
  }

  function insertText(data) {
    if (!data) return;
    const parent = top();
    const kids = kidsArray(parent);
    const last = kids[kids.length - 1];
    if (last && last.type === 'text') last.data += data;
    else {
      const t = new Txt(data);
      t.parent = parent;
      kids.push(t);
    }
  }

  function insertStart(tok) {
    const name = tok.name;

    // ─ the <mglyph> / <malignmark> exception ─
    // Inside a MathML text integration point (<mi>/<mo>/<mn>/<ms>/<mtext>) the
    // parser is running HTML rules — EXCEPT that a <mglyph> or <malignmark>
    // start tag stays in the MathML namespace. This is the hinge of the
    // classic <math><mtext>…<mglyph><style> DOMPurify bypass (Bentkowski 2019):
    // it puts a <style> back into MathML, where <style> is not rawtext.
    const parent = top();
    if ((name === 'mglyph' || name === 'malignmark') &&
        parent.type === 'element' && parent.ns === MATHML &&
        MATHML_TEXT_INTEGRATION.has(parent.name) && curNs() === HTML) {
      const el = new El(name, MATHML);
      el.attrs = tok.attrs.slice();
      append(parent, el);
      if (!tok.selfClosing) { stack.push(el); nsStack.push(MATHML); }
      return null;
    }

    // ─ foreign-content handling ─
    if (curNs() !== HTML) {
      if (BREAKOUT.has(name)) {
        // pop every foreign element, back to HTML, then process as HTML
        while (stack.length > 1 && curNs() !== HTML) { stack.pop(); nsStack.pop(); }
      } else {
        // insert as a foreign element in the current namespace
        const ns = curNs();
        let n = name;
        if (ns === SVG && SVG_CASE[name]) n = SVG_CASE[name];
        const el = new El(n, ns);
        el.attrs = tok.attrs.slice();
        append(top(), el);
        if (!tok.selfClosing) {
          stack.push(el);
          // integration point? then content parses as HTML
          const isIntegration =
            (ns === SVG && SVG_HTML_INTEGRATION.has(name)) ||
            (ns === MATHML && MATHML_TEXT_INTEGRATION.has(name)) ||
            (ns === MATHML && name === 'annotation-xml' &&
             /^(text\/html|application\/xhtml\+xml)$/i.test(el.attr('encoding') || ''));
          nsStack.push(isIntegration ? HTML : ns);
        }
        return null;
      }
    }

    // ─ HTML namespace ─
    if (name === 'svg') { const el = mkHtmlEl(tok, SVG); if (!tok.selfClosing) { stack.push(el); nsStack.push(SVG); } return null; }
    if (name === 'math') { const el = mkHtmlEl(tok, MATHML); if (!tok.selfClosing) { stack.push(el); nsStack.push(MATHML); } return null; }

    if (name === 'template') {
      const el = new El('template', HTML);
      el.attrs = tok.attrs.slice();
      el.content = new Frag();
      el.content.parent = el;
      append(top(), el);
      stack.push(el); nsStack.push(HTML);
      return null;
    }

    const el = new El(name, HTML);
    el.attrs = tok.attrs.slice();
    append(top(), el);

    if (VOID.has(name) || tok.selfClosing) return null;

    stack.push(el); nsStack.push(HTML);

    // rawtext / rcdata entry (HTML namespace only)
    if (RAWTEXT.has(name)) return { mode: 'rawtext', rawTag: name };
    if (RCDATA.has(name)) return { mode: 'rcdata', rawTag: name };
    if (name === 'noscript' && scripting) return { mode: 'rawtext', rawTag: name };

    return null;
  }

  function mkHtmlEl(tok, ns) {
    const el = new El(ns === SVG ? 'svg' : ns === MATHML ? 'math' : tok.name, ns);
    el.attrs = tok.attrs.slice();
    append(top(), el);
    return el;
  }

  function popByName(name) {
    for (let k = stack.length - 1; k >= 1; k--) {
      if (stack[k].name.toLowerCase() === name) {
        while (stack.length - 1 >= k) { stack.pop(); nsStack.pop(); }
        return;
      }
    }
    // unmatched end tag: ignore (close enough for our constructs)
  }

  run();
  return root;
}

// ── public parse entry points ────────────────────────────────────────
export function parseDocument(html, opts = {}) {
  return { root: build(html, opts) };
}
export function parseFragment(html, contextTag = 'body', opts = {}) {
  return build(html, { ...opts, fragmentContext: contextTag });
}

// ══════════════════════════════════════════════════════════════════════
// SERIALIZER — the innerHTML *getter*, WHATWG §13.3 "serialising HTML fragments"
// ══════════════════════════════════════════════════════════════════════
const NO_ESCAPE_TEXT = new Set(['style', 'script', 'xmp', 'iframe', 'noembed',
  'noframes', 'noscript', 'plaintext']);

function escapeText(s) {
  return s.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// The pre-2020 attribute serializer (no < > escaping), for Module 6's before/after.
export function escapeAttrLegacy(s) {
  return s.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/"/g, '&quot;');
}

export function serialize(node) {
  const kids = node.content ? node.content.children : (node.children || []);
  let out = '';
  for (const child of kids) {
    if (child.type === 'text') {
      const parentName = node.name ? node.name.toLowerCase() : '';
      out += NO_ESCAPE_TEXT.has(parentName) ? child.data : escapeText(child.data);
    } else if (child.type === 'comment') {
      out += `<!--${child.data}-->`;
    } else if (child.type === 'element') {
      out += serializeElement(child);
    }
  }
  return out;
}

function serializeElement(el) {
  const name = el.ns === HTML ? el.name : el.name; // keep given case
  let s = `<${name}`;
  for (const [k, v] of el.attrs) s += ` ${k}="${escapeAttr(v)}"`;
  s += '>';
  if (VOID.has(el.name.toLowerCase()) && el.ns === HTML) return s;
  s += serialize(el);
  s += `</${name}>`;
  return s;
}

// ══════════════════════════════════════════════════════════════════════
// ROUND TRIP — the whole point of the course
// ══════════════════════════════════════════════════════════════════════
export function roundTrip(html, { contextTag = 'body', scripting = false, max = 5 } = {}) {
  const steps = [html];
  let cur = html;
  for (let k = 0; k < max; k++) {
    const tree = parseFragment(cur, contextTag, { scripting });
    const next = serialize(tree);
    steps.push(next);
    if (next === cur) return { steps, stable: true, iterations: k + 1 };
    cur = next;
  }
  return { steps, stable: false, iterations: max };
}

// ── probes the attack modules reuse ──────────────────────────────────
// Does the tree contain an element with an on* handler attribute, or a
// javascript:/data: URL? i.e. "would a browser run something here?"
export function hasLiveHandler(node) {
  const kids = node.content ? node.content.children : (node.children || []);
  for (const c of kids) {
    if (c.type !== 'element') continue;
    if (c.attrs.some(([k, v]) =>
      /^on/i.test(k) || (/^(href|src|xlink:href)$/i.test(k) && /^\s*(javascript|data):/i.test(v)))) return true;
    if (hasLiveHandler(c)) return true;
  }
  return false;
}
export function elementNames(node, acc = []) {
  const kids = node.content ? node.content.children : (node.children || []);
  for (const c of kids) {
    if (c.type === 'element') { acc.push(c.name.toLowerCase()); elementNames(c, acc); }
  }
  return acc;
}

// ── ASCII tree for tutorials ─────────────────────────────────────────
export function treeString(node, prefix = '', isLast = true, isRoot = true) {
  let label;
  if (node.type === 'element') {
    const nsTag = node.ns === SVG ? ' {svg}' : node.ns === MATHML ? ' {math}' : '';
    const attrs = node.attrs.length ? ' ' + node.attrs.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ') : '';
    label = node.name + nsTag + attrs;
  } else if (node.type === 'text') label = `#text ${JSON.stringify(node.data)}`;
  else if (node.type === 'comment') label = `#comment ${JSON.stringify(node.data)}`;
  else label = node.type === 'fragment' ? '#fragment' : '#root';

  const lines = [isRoot ? label : prefix + (isLast ? '└─ ' : '├─ ') + label];
  const cp = isRoot ? '' : prefix + (isLast ? '   ' : '│  ');
  let kids = node.type === 'fragment' || node.name === '#root' ? node.children : (node.children || []);
  if (node.type === 'element' && node.content) {
    lines.push(cp + '└─ #document-fragment (template content)');
    node.content.children.forEach((c, idx) =>
      lines.push(...treeString(c, cp + '   ', idx === node.content.children.length - 1, false)));
    kids = [];
  }
  kids.forEach((c, idx) => lines.push(...treeString(c, cp, idx === kids.length - 1, false)));
  return lines;
}
