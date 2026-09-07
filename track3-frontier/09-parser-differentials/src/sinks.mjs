// Module 9 — Parser Differentials: the Sink Zoo
//
// The mutation-XSS round trip is one member of a family. There are (at least)
// seven ways a string becomes a tree in a browser, and they do NOT all agree:
//
//   1. element.innerHTML = s            fragment parse, context = element, scripting ON
//   2. element.outerHTML = s            fragment parse, context = element.parent
//   3. new DOMParser().parseFromString  document parse, scripting OFF
//   4. range.createContextualFragment   fragment parse, context = range's container, scripting ON
//   5. template.innerHTML = s           fragment parse, context = template, scripting OFF
//   6. new XMLSerializer().serialize    XML rules (not §13.3): always self-close, ns explicit
//   7. document.write(s)                document parse, INTO the open stream, scripting ON
//
// This file models the ones expressible without a live browser (1–3, 5) and a
// naive XML serializer (6). Sinks 4 and 7 are browser-only and covered in
// proof territory / the tutorial table.

import { parseFragment, parseDocument, serialize, treeString, elementNames, hasLiveHandler, El, Txt, SVG, MATHML, HTML }
  from '../../../engine/mxss-lab/lab.mjs';

export { parseFragment, serialize, treeString, elementNames, hasLiveHandler };

// A deliberately-naive XML serializer: XML rules, not HTML §13.3.
export function xmlSerialize(node) {
  const kids = node.content ? node.content.children : (node.children || []);
  let out = '';
  for (const c of kids) {
    if (c.type === 'text') out += c.data.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    else if (c.type === 'comment') out += `<!--${c.data}-->`;
    else if (c.type === 'element') {
      const ns = c.ns === SVG ? ' xmlns="http://www.w3.org/2000/svg"' : c.ns === MATHML ? ' xmlns="http://www.w3.org/1998/Math/MathML"' : '';
      let s = `<${c.name}${ns}`;
      for (const [k, v] of c.attrs) s += ` ${k}="${v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')}"`;
      const inner = xmlSerialize(c);
      s += inner ? `>${inner}</${c.name}>` : ' />';    // XML: EVERYTHING self-closes when empty
      out += s;
    }
  }
  return out;
}

// Run one string through the modellable sinks and report the resulting element list.
export function sinkDifferential(html) {
  const asInnerHTML_div = parseFragment(html, 'div', { scripting: true });
  const asInnerHTML_body = parseFragment(html, 'body', { scripting: true });
  const asDOMParser = parseDocument(html, { scripting: false }).root;
  const asTemplate = parseFragment(html, 'template', { scripting: false });
  return {
    'innerHTML (div, scripting on)':  { elements: elementNames(asInnerHTML_div), live: hasLiveHandler(asInnerHTML_div) },
    'innerHTML (body, scripting on)': { elements: elementNames(asInnerHTML_body), live: hasLiveHandler(asInnerHTML_body) },
    'DOMParser (scripting off)':      { elements: elementNames(asDOMParser), live: hasLiveHandler(asDOMParser) },
    'template.innerHTML (off)':       { elements: elementNames(asTemplate), live: hasLiveHandler(asTemplate) },
    'HTML-serialize then XML-serialize': { note: 'XML self-closes empty elements — <div/> reparses differently', xml: xmlSerialize(parseFragment(html, 'body')) },
  };
}

// Do any two modellable sinks disagree on the element list for this string?
export function sinksDisagree(html) {
  const d = sinkDifferential(html);
  const lists = Object.values(d).filter(v => v.elements).map(v => v.elements.join(','));
  return new Set(lists).size > 1;
}
