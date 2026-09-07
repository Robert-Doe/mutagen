// Module 6 — mXSS via Attribute Serialization
//
// Proves: a character reference or a quote inside an attribute value, if the
// serializer does not escape it, breaks OUT of the attribute on the next parse.
// The modern serializer escapes & " < > in attribute values; the pre-2020 one
// escaped only & ". This module shows the exact payloads that generation flip
// closed, and the ones that were always closed.

import { parseFragment, serialize, treeString, elementNames, hasLiveHandler, escapeAttrLegacy }
  from '../../../engine/mxss-lab/lab.mjs';

export { parseFragment, serialize, treeString, elementNames, hasLiveHandler };

// Serialize a parsed tree with the LEGACY attribute rule (no < > escaping),
// everything else identical to the modern serializer.
export function legacySerialize(node) {
  const kids = node.content ? node.content.children : (node.children || []);
  const NO_ESC = new Set(['style', 'script', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript', 'plaintext']);
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  let out = '';
  for (const c of kids) {
    if (c.type === 'text') {
      const pn = node.name ? node.name.toLowerCase() : '';
      out += NO_ESC.has(pn) ? c.data
        : c.data.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    } else if (c.type === 'comment') {
      out += `<!--${c.data}-->`;
    } else if (c.type === 'element') {
      out += `<${c.name}`;
      for (const [k, v] of c.attrs) out += ` ${k}="${escapeAttrLegacy(v)}"`;
      out += '>';
      if (!(VOID.has(c.name.toLowerCase()) && c.ns === 'http://www.w3.org/1999/xhtml')) {
        out += legacySerialize(c) + `</${c.name}>`;
      }
    }
  }
  return out;
}

// Round-trip a payload through BOTH serializers and report whether a handler is
// live after the browser (scripting on) re-parses each.
export function bothSerializers(html, contextTag = 'body') {
  const tree = parseFragment(html, contextTag, { scripting: false });
  const modern = serialize(tree);
  const legacy = legacySerialize(tree);
  const live = s => hasLiveHandler(parseFragment(s, contextTag, { scripting: true }));
  return {
    parsedSafely: !hasLiveHandler(tree),         // sanitizer's view: is the source tree safe?
    modern: { out: modern, live: live(modern) },
    legacy: { out: legacy, live: live(legacy) },
  };
}

// The catalogue. Each payload parses to a SAFE tree (handler is data, in an
// attribute) — the mutation is entirely in the serialize→reparse step.
export const VECTORS = [
  { name: 'entity-encoded </title> in a title attr',
    payload: '<x title="&lt;/title&gt;&lt;img src=x onerror=alert(1)&gt;"></x>' },
  { name: 'raw </style> in a kept style-adjacent attr',
    payload: '<a title="</a><img src=x onerror=alert(1)>"></a>' },
  { name: 'quote break-out (attempt)',
    payload: `<a title='x"><img src=x onerror=alert(1)>'></a>` },
];

// IE backtick vector — HISTORY ONLY, not run. Old IE treated ` as a quote char
// in unquoted attribute values, so `<img src=\`x\`onerror=alert(1)>` parsed as
// src="x" + onerror="alert(1)". No current browser does this; documented so the
// timeline in lessons/01 is complete.
export const IE_BACKTICK_HISTORY = '<img src=`xx`onerror=alert(1)>';
