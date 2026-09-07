// Module 2 — The Serializer, and Why It Won't Round-Trip
//
// Owns the serialization + round-trip parts of engine/mxss-lab/lab.mjs:
//   serialize(node)     — the innerHTML *getter* algorithm, WHATWG §13.3
//   roundTrip(html, ..) — parse → serialize → parse, until it stabilises
//
// This file adds analysis helpers the tutorial and tests use.

import {
  serialize, roundTrip, parseFragment, treeString,
  escapeAttrLegacy,
} from '../../../engine/mxss-lab/lab.mjs';

export { serialize, roundTrip, parseFragment, treeString };

// Elements whose text content the serializer emits RAW — no &lt; / &amp; escaping.
// This is the list every rawtext mutation-XSS in Module 3 depends on.
export const NO_ESCAPE = ['style', 'script', 'xmp', 'iframe', 'noembed',
  'noframes', 'noscript', 'plaintext'];

// Is parse∘serialize idempotent for this input? Returns how many rounds it took
// to reach a fixed point, and whether it ever did (within `max`).
export function idempotencyReport(html, { contextTag = 'body', scripting = false, max = 6 } = {}) {
  const r = roundTrip(html, { contextTag, scripting, max });
  return {
    input: html,
    firstPassChangesString: r.steps[0] !== r.steps[1],
    reachedFixedPoint: r.stable,
    rounds: r.iterations,
    steps: r.steps,
  };
}

// Show the same tree serialized by the modern serializer vs. the pre-2020 one
// (no < > escaping in attribute values). Module 6 leans on this.
export function serializeModernVsLegacy(html, contextTag = 'body') {
  const tree = parseFragment(html, contextTag);
  const modern = serialize(tree);
  // rebuild a legacy serialization by re-parsing modern output's attrs... simplest:
  // walk and re-emit with escapeAttrLegacy
  const legacy = legacySerialize(tree);
  return { modern, legacy, differ: modern !== legacy };
}

function legacySerialize(node) {
  const kids = node.content ? node.content.children : (node.children || []);
  let out = '';
  for (const c of kids) {
    if (c.type === 'text') {
      const pn = node.name ? node.name.toLowerCase() : '';
      out += NO_ESCAPE.includes(pn) ? c.data
        : c.data.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    } else if (c.type === 'comment') out += `<!--${c.data}-->`;
    else if (c.type === 'element') {
      out += `<${c.name}`;
      for (const [k, v] of c.attrs) out += ` ${k}="${escapeAttrLegacy(v)}"`;
      out += '>';
      const VOID = ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'];
      if (!(VOID.includes(c.name.toLowerCase()) && c.ns === 'http://www.w3.org/1999/xhtml')) {
        out += legacySerialize(c) + `</${c.name}>`;
      }
    }
  }
  return out;
}
