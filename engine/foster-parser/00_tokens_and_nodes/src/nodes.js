'use strict';

// The four DOM node kinds tree construction produces/moves. See
// prerequisites/prereq_dom_node_shape.html. Classes here (unlike tokens.js) because
// nodes need identity (===) and mutable state (parent, children) over their lifetime —
// see DECISIONS.md, "own convention" #2.

class Node {
  constructor() {
    this.parent = null;
  }
}

class DocumentNode extends Node {
  constructor() {
    super();
    this.children = [];
  }
}

class ElementNode extends Node {
  constructor(tagName) {
    super();
    this.tagName = tagName;
    this.attrs = new Map();
    this.children = [];
  }
}

class TextNode extends Node {
  constructor(data) {
    super();
    this.data = data;
  }
}

class CommentNode extends Node {
  constructor(data) {
    super();
    this.data = data;
  }
}

// Added in Module 11 (additively — nothing above this line changed). Deliberately
// deferred until then: Module 00's DECISIONS.md scoped the engine to four node kinds
// because no module before 11 ever needed to represent a <template>'s content, which
// lives in a separate tree, disconnected from the main document. See Module 11's
// DECISIONS.md.
class DocumentFragmentNode extends Node {
  constructor() {
    super();
    this.children = [];
  }
}

function isParentNode(node) {
  return node instanceof DocumentNode || node instanceof ElementNode || node instanceof DocumentFragmentNode;
}

// Splice `node` into `parent`'s children, at `index` (default: append after last child).
// This is the one operation every "insert a ___" algorithm in later modules bottoms out
// in — see prerequisites/prereq_appropriate_place.html. Centralizing it here means every
// module's "insert" logic is this one function called with a different (parent, index).
function insertNode(parent, node, index = parent.children.length) {
  if (!isParentNode(parent)) {
    throw new TypeError(`Cannot insert into a ${parent.constructor.name} — it has no children array.`);
  }
  node.parent = parent;
  parent.children.splice(index, 0, node);
  return node;
}

// Text-node fusion (Track 1 Module 09 depends on this): if the node immediately before
// `index` in `parent` is a TextNode, append `data` to it instead of inserting a new node.
// Returns true if it fused, false if the caller still needs to insert a new TextNode.
function tryFuseCharacter(parent, data, index = parent.children.length) {
  const before = parent.children[index - 1];
  if (before instanceof TextNode) {
    before.data += data;
    return true;
  }
  return false;
}

// Render a node subtree as the same ASCII tree shape used throughout this course's
// tutorials (└─ / │ connectors), so a module's demo output can be visually compared
// against a tutorial.html's .tree diagram by eye.
function renderTree(node, prefix = '', isLast = true, isRoot = true) {
  const lines = [];
  const label = describeNode(node);
  if (isRoot) {
    lines.push(label);
  } else {
    lines.push(prefix + (isLast ? '└─ ' : '├─ ') + label);
  }
  const childPrefix = isRoot ? '' : prefix + (isLast ? '   ' : '│  ');
  const children = node.children ?? [];
  children.forEach((child, i) => {
    lines.push(...renderTree(child, childPrefix, i === children.length - 1, false));
  });
  return lines;
}

function describeNode(node) {
  if (node instanceof DocumentNode) return '#document';
  if (node instanceof DocumentFragmentNode) return '#document-fragment';
  if (node instanceof ElementNode) return node.tagName;
  if (node instanceof TextNode) return `#text ${JSON.stringify(node.data)}`;
  if (node instanceof CommentNode) return `#comment ${JSON.stringify(node.data)}`;
  throw new Error(`Unknown node kind: ${node?.constructor?.name}`);
}

module.exports = {
  Node,
  DocumentNode,
  ElementNode,
  TextNode,
  CommentNode,
  DocumentFragmentNode,
  isParentNode,
  insertNode,
  tryFuseCharacter,
  renderTree,
  describeNode,
};
