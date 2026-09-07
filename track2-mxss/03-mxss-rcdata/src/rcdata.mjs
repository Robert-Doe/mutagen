// Module 3 — mXSS via RCDATA / Rawtext Wrapper Removal
//
// This module proves two things:
//   1. The NAIVE rawtext mXSS ("remove <title>/<style>, its text goes live") is
//      CLOSED by a correct serializer — promoted text is escaped. Shown, verified.
//   2. It stops being closed the moment you swap in a STRING-based filter, or add
//      one of {namespace, scripting flag, template}. Modules 4, 5, 7 are each of
//      those.

import { parseFragment, serialize, treeString, hasLiveHandler, elementNames } from '../../../engine/mxss-lab/lab.mjs';
import { domSanitizer, regexSanitizer } from '../../../engine/mxss-lab/sanitizers.mjs';

export { parseFragment, serialize, treeString, hasLiveHandler, domSanitizer, regexSanitizer };

// The strict allow-list for this module: no style/title/textarea/xmp/noembed.
export const STRICT = {
  allow: {
    elements: new Set(['a', 'b', 'i', 'em', 'p', 'br', 'span', 'div', 'ul', 'ol', 'li', 'img', 'code', 'pre']),
    attributes: new Set(['href', 'src', 'alt', 'title', 'class']),
  },
};

// The full round trip a sanitized value takes: sanitize (scripting off) -> the
// browser re-parses the result at innerHTML. Returns whether a handler is live
// in that final tree.
export function throughSanitizerThenBrowser(html, opts = STRICT) {
  const cleaned = domSanitizer(html, opts);
  const finalTree = parseFragment(cleaned, opts.contextTag || 'body', { scripting: true });
  return { cleaned, finalTree, live: hasLiveHandler(finalTree) };
}

// The one property the whole "naive mXSS is blocked" result rests on: when the
// serializer emits a text node, it escapes < > & UNLESS the parent is one of the
// raw-text elements. Removing a raw-text wrapper promotes its text to a normal
// parent, so it gets escaped. Keeping the wrapper is what would be dangerous.
export const RAW_TEXT_PARENTS = ['style', 'script', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript', 'plaintext'];

export function serializerEscapesPromotedText(rawWrapper) {
  const payload = '<img src=x onerror=alert(1)>';
  const before = parseFragment(`<${rawWrapper}>${payload}</${rawWrapper}>`, 'body');
  // remove the wrapper, keep the text child, re-serialize
  const kept = before.children[0];             // the wrapper element
  const text = (kept.content ? kept.content.children : kept.children)[0];
  before.children = [text];
  text.parent = before;
  return serialize(before);                    // expect &lt;img ... &gt;  (escaped, safe)
}
