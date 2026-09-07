'use strict';

// The spec's "special" category — a fixed list of elements tree construction treats
// as structural (block-level, table-family, form-family, and a handful more), used
// by the adoption agency algorithm to decide whether a misnested formatting element
// needs the full clone-and-relocate treatment or just a plain pop. Reproduced in
// full from the spec's own list rather than trimmed to this module's test cases —
// unlike most sets in this course, narrowing it would risk silently changing WHICH
// of a reader's own test inputs trigger cloning, for a list that costs nothing extra
// to keep complete (a flat Set literal, no behavior attached). See DECISIONS.md.
const SPECIAL_CATEGORY = new Set([
  'address', 'applet', 'area', 'article', 'aside', 'base', 'basefont', 'bgsound',
  'blockquote', 'body', 'br', 'button', 'caption', 'center', 'col', 'colgroup',
  'dd', 'details', 'dir', 'div', 'dl', 'dt', 'embed', 'fieldset', 'figcaption',
  'figure', 'footer', 'form', 'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5',
  'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'iframe', 'img', 'input',
  'isindex', 'li', 'link', 'listing', 'main', 'marquee', 'menu', 'meta', 'nav',
  'noembed', 'noframes', 'noscript', 'object', 'ol', 'p', 'param', 'plaintext',
  'pre', 'script', 'section', 'select', 'source', 'style', 'summary', 'table',
  'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'title', 'tr',
  'track', 'ul', 'wbr',
]);

module.exports = { SPECIAL_CATEGORY };
