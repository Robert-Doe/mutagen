// Module 4 — mXSS via the Scripting Flag (<noscript>)
//
// Proves: the SAME string parses into two different trees depending on the
// scripting flag, and a sanitizer (flag off) can approve a tree the browser
// (flag on) never builds — the Google Search 2019 mechanism.
//
// Honest result for Chrome 148: the classic <noscript><p title="</noscript>…">
// vector is CLOSED by the modern attribute serializer (< > escaped). The
// mechanism is intact; the residual risk is (a) string sanitizers, (b)
// sanitizers that ALLOW <noscript>, (c) older browsers / non-browser reparsers.

import { parseFragment, serialize, treeString, elementNames, hasLiveHandler } from '../../../engine/mxss-lab/lab.mjs';
import { domSanitizer } from '../../../engine/mxss-lab/sanitizers.mjs';

export { parseFragment, serialize, treeString, elementNames, hasLiveHandler, domSanitizer };

// Parse the same html both ways and report the difference.
export function bothFlags(html, contextTag = 'body') {
  const off = parseFragment(html, contextTag, { scripting: false });
  const on = parseFragment(html, contextTag, { scripting: true });
  return {
    off: { elements: elementNames(off), serialized: serialize(off), live: hasLiveHandler(off) },
    on: { elements: elementNames(on), serialized: serialize(on), live: hasLiveHandler(on) },
    differ: serialize(off) !== serialize(on),
  };
}

// The composition: sanitizer runs flag OFF, browser sink runs flag ON.
export function serverSanitizeThenBrowser(html, opts = {}) {
  const cleaned = domSanitizer(html, { scripting: false, ...opts }); // domSanitizer is always flag-off
  const inBrowser = parseFragment(cleaned, opts.contextTag || 'body', { scripting: true });
  return { cleaned, live: hasLiveHandler(inBrowser), elements: elementNames(inBrowser) };
}
