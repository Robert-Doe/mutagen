'use strict';

const {
  doctypeToken,
  startTagToken,
  endTagToken,
  commentToken,
  characterToken,
  eofToken,
} = require('../../00_tokens_and_nodes/src/tokens.js');

// A minimal, hand-rolled tokenizer — NOT the spec's ~80-state machine (see
// ROADMAP.md, "Tools / Architecture Target"). It implements only enough to correctly
// emit the six Prerequisite-P1 token shapes for the well-formed subset of HTML this
// course's test cases use: DOCTYPE, comments, start/end tags with simple quoted /
// unquoted / boolean attributes, and character data. No entity decoding, no
// RAWTEXT/RCDATA tokenizer states, no malformed-markup error recovery — those are
// explicitly out of scope until a later module needs them (see DECISIONS.md).

function tokenize(input) {
  const tokens = [];
  let i = 0;
  const n = input.length;

  function emitCharacterRun(text) {
    for (const ch of text) tokens.push(characterToken(ch));
  }

  while (i < n) {
    if (input[i] !== '<') {
      const next = input.indexOf('<', i);
      const end = next === -1 ? n : next;
      emitCharacterRun(input.slice(i, end));
      i = end;
      continue;
    }

    if (input.startsWith('<!--', i)) {
      const close = input.indexOf('-->', i + 4);
      const stop = close === -1 ? n : close;
      tokens.push(commentToken(input.slice(i + 4, stop)));
      i = close === -1 ? n : close + 3;
      continue;
    }

    if (/^<!doctype/i.test(input.slice(i, i + 9))) {
      const close = input.indexOf('>', i);
      const stop = close === -1 ? n : close;
      const body = input.slice(i + 9, stop).trim();
      const name = body.length ? body.split(/\s+/)[0].toLowerCase() : null;
      tokens.push(doctypeToken(name));
      i = close === -1 ? n : close + 1;
      continue;
    }

    if (input[i + 1] === '/') {
      const close = input.indexOf('>', i);
      const stop = close === -1 ? n : close;
      const tagName = input.slice(i + 2, stop).trim().split(/\s+/)[0].toLowerCase();
      tokens.push(endTagToken(tagName));
      i = close === -1 ? n : close + 1;
      continue;
    }

    if (/^[a-zA-Z]/.test(input[i + 1] || '')) {
      const close = findTagEnd(input, i);
      const raw = input.slice(i + 1, close);
      const { tagName, attrs, selfClosing } = parseStartTag(raw);
      tokens.push(startTagToken(tagName, attrs, selfClosing));
      i = close + 1;
      continue;
    }

    // A bare '<' that doesn't open a recognized construct: treated as a literal
    // character. A deliberate simplification, not spec behavior — see DECISIONS.md.
    tokens.push(characterToken('<'));
    i += 1;
  }

  tokens.push(eofToken());
  return tokens;
}

// Finds the '>' that closes a start tag, respecting quoted attribute values so a
// '>' inside e.g. title="a>b" doesn't end the tag early.
function findTagEnd(input, start) {
  let i = start + 1;
  let quote = null;
  while (i < input.length) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
    i += 1;
  }
  return input.length;
}

function parseStartTag(raw) {
  // raw is everything between '<' and '>', e.g. `table` or `input type="hidden" `
  let body = raw;
  let selfClosing = false;
  if (body.trimEnd().endsWith('/')) {
    selfClosing = true;
    body = body.trimEnd().slice(0, -1);
  }
  const firstSpace = body.search(/\s/);
  const tagName = (firstSpace === -1 ? body : body.slice(0, firstSpace)).trim().toLowerCase();
  const attrSource = firstSpace === -1 ? '' : body.slice(firstSpace);

  const attrRe = /([^\s="'>/]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|[^\s"'=<>`]+))?/g;
  const attrs = [];
  let m;
  while ((m = attrRe.exec(attrSource))) {
    const name = m[1].toLowerCase();
    const value = m[3] ?? m[4] ?? m[2] ?? '';
    if (!attrs.some(([k]) => k === name)) attrs.push([name, value]); // first-occurrence-wins
  }
  return { tagName, attrs, selfClosing };
}

module.exports = { tokenize };
