'use strict';

// The six token shapes a tokenizer can emit. See prerequisites/prereq_tokens.html.
// These are plain factory functions, not classes: tree construction only ever reads
// these fields, never mutates or subclasses a token, so a class hierarchy would add
// nothing (see DECISIONS.md, "own convention" #1).

function doctypeToken(name, publicId = null, systemId = null, forceQuirks = false) {
  return { type: 'DOCTYPE', name, publicId, systemId, forceQuirks };
}

function startTagToken(tagName, attrs = [], selfClosing = false) {
  // attrs: array of [name, value] pairs, first-occurrence-wins per the tokenizer spec
  // (a later duplicate attribute is a parse error and is dropped) — modeled here as a
  // Map built left-to-right so a second `set()` for the same key is a silent no-op only
  // if the caller checks first; tokens.js itself does not enforce this, callers must.
  return { type: 'StartTag', tagName, attrs: new Map(attrs), selfClosing };
}

function endTagToken(tagName) {
  // Real tokenizers parse attributes on end tags and then discard them (parse error).
  // We never construct that intermediate state — an end tag token in this engine
  // carries only what tree construction is ever allowed to look at.
  return { type: 'EndTag', tagName };
}

function commentToken(data) {
  return { type: 'Comment', data };
}

function characterToken(data) {
  if (data.length !== 1) {
    throw new RangeError(
      `characterToken() takes exactly one character, got ${JSON.stringify(data)} ` +
      `(length ${data.length}). The tokenizer never batches characters into a token — ` +
      'see prerequisites/prereq_tokens.html and Track 1 Module 08.'
    );
  }
  return { type: 'Character', data };
}

function eofToken() {
  return { type: 'EOF' };
}

// A run of character tokens, for convenience when a caller wants to hand-author a
// sequence without writing characterToken() once per letter. Expands to N Character
// tokens — it is sugar over the constructor above, never a seventh token type.
function characterTokens(text) {
  return Array.from(text).map(characterToken);
}

function tokenToString(token) {
  switch (token.type) {
    case 'DOCTYPE':
      return `DOCTYPE(${token.name ?? ''})`;
    case 'StartTag': {
      const attrStr = [...token.attrs.entries()].map(([k, v]) => ` ${k}="${v}"`).join('');
      return `<${token.tagName}${attrStr}${token.selfClosing ? ' /' : ''}>`;
    }
    case 'EndTag':
      return `</${token.tagName}>`;
    case 'Comment':
      return `<!--${token.data}-->`;
    case 'Character':
      return JSON.stringify(token.data);
    case 'EOF':
      return 'EOF';
    default:
      throw new Error(`Unknown token type: ${token.type}`);
  }
}

module.exports = {
  doctypeToken,
  startTagToken,
  endTagToken,
  commentToken,
  characterToken,
  characterTokens,
  eofToken,
  tokenToString,
};
