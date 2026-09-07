// Module 8 — The Hardened Sanitizer
//
// ONE sanitizer that closes every vector from Modules 3–7, built from four
// ideas, each traceable to a real DOMPurify mechanism:
//
//   1. loop to a fixed point         ← DOMPurify's  do { ... } while (dirty)  removed;
//                                       today: _sanitize is called once but the
//                                       "clobbered / mutated during walk" re-check
//                                       plus a stable serialisation give the same
//                                       guarantee. We keep the explicit loop because
//                                       it is the clearest statement of the property.
//   2. enforce the HTML namespace    ← DOMPurify._checkValidNamespace
//   3. unwrap <template>, forbid the ← DOMPurify: <template> not in ALLOWED_TAGS;
//      known mutation elements          FORBID_CONTENTS / _forceRemove
//   4. scrub attributes on EVERY      ← DOMPurify._sanitizeAttributes runs per node,
//      surviving node                    including nodes promoted out of removed parents
//
// The implementation lives in engine/mxss-lab/sanitizers.mjs (hardenedSanitizer);
// this file re-exports it and provides the module's test surface.

import { hardenedSanitizer, domSanitizer, DEFAULT_ALLOW } from '../../../engine/mxss-lab/sanitizers.mjs';
import { parseFragment, serialize, hasLiveHandler, elementNames } from '../../../engine/mxss-lab/lab.mjs';

export { hardenedSanitizer, domSanitizer, DEFAULT_ALLOW, parseFragment, serialize, hasLiveHandler, elementNames };

// Every attack payload this course produced, in one list, for the regression test.
export const ALL_VECTORS = {
  'M3 rawtext: title':   '<title><img src=x onerror=alert(1)></title>',
  'M3 rawtext: style':   '<style><img src=x onerror=alert(1)></style>',
  'M3 rawtext: xmp':     '<xmp><img src=x onerror=alert(1)></xmp>',
  'M4 noscript minimal': '<noscript><img src=x onerror=alert(1)></noscript>',
  'M4 noscript attr':    '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></p></noscript>',
  'M5 form double-nest': '<form><math><mtext></form><form><img src=x onerror=alert(1)></form>',
  'M5 mtext/mglyph/style':'<math><mtext><mglyph><style><img src=x onerror=alert(1)></style></mglyph></mtext></math>',
  'M5 image alias':      '<svg><image href=x onerror=alert(1)></svg>',
  'M5 svg/p breakout':   '<svg><p><style><a id="</style><img src=x onerror=alert(1)>"></a></style></svg>',
  'M6 attr entity':      '<x title="&lt;/title&gt;&lt;img src=x onerror=alert(1)&gt;"></x>',
  'M7 template':         '<template><img src=x onerror=alert(1)></template>',
  'M7 nested template':  '<template><template><img src=x onerror=alert(1)></template></template>',
};

export const BENIGN = [
  '<p>hello <b>world</b> <a href="/x">link</a></p>',
  '<ul><li>a</li><li>b</li></ul>',
  '<img src="/logo.png" alt="logo">',
  '<blockquote><p>quote</p></blockquote>',
];

// Does a cleaned string survive the browser's scripting-on re-parse without a handler?
export function safeAfterBrowser(cleaned) {
  return !hasLiveHandler(parseFragment(cleaned, 'body', { scripting: true }));
}
