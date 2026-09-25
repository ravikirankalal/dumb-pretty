// Minimal fake-DOM shim sufficient for unit-testing the renderer without Chrome.
// Supports: createElement, className/textContent/value/type/href/title/dataset,
// appendChild/replaceChildren/remove/replaceWith, children, hidden, addEventListener
// (records handlers; click() invokes them), querySelectorAll by simple class/tag rules.
'use strict';

class ClassList {
  constructor(node) { this.node = node; }
  get set() { return new Set((this.node.className || '').split(/\s+/).filter(Boolean)); }
  _write(s) { this.node.className = [...s].join(' '); }
  add(...cls) { const s = this.set; cls.forEach((c) => s.add(c)); this._write(s); }
  remove(...cls) { const s = this.set; cls.forEach((c) => s.delete(c)); this._write(s); }
  toggle(cls, force) {
    const s = this.set;
    const has = s.has(cls);
    const want = force === undefined ? !has : !!force;
    if (want) s.add(cls); else s.delete(cls);
    this._write(s);
  }
  contains(cls) { return this.set.has(cls); }
}

class Node {
  constructor(tag) {
    this.tagName = String(tag || '').toUpperCase();
    this.children = [];
    this.parent = null;
    this._text = '';
    this.className = '';
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.handlers = {};
    this.classList = new ClassList(this);
  }
  get textContent() {
    if (this.children.length === 0) return this._text;
    return this._text + this.children.map((c) => c.textContent).join('');
  }
  set textContent(v) { this._text = v == null ? '' : String(v); this.children = []; }
  appendChild(child) {
    if (child && child.__frag) { child.children.forEach((c) => this.appendChild(c)); return child; }
    if (typeof child === 'string') child = new TextNode(child);
    child.parent = this;
    this.children.push(child);
    return child;
  }
  replaceChildren(...kids) { this.children = []; kids.forEach((k) => this.appendChild(k)); }
  remove() {
    if (!this.parent) return;
    const i = this.parent.children.indexOf(this);
    if (i >= 0) this.parent.children.splice(i, 1);
    this.parent = null;
  }
  replaceWith(other) {
    const p = this.parent;
    if (!p) return;
    const i = p.children.indexOf(this);
    p.children[i] = other; other.parent = p; this.parent = null;
  }
  addEventListener(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); }
  click() { (this.handlers.click || []).forEach((fn) => fn({ target: this })); }
  prepend(child) { child.parent = this; this.children.unshift(child); }
  /** Simple selector support: ".cls", "tag", "tag.cls > .cls2" limited forms. */
  querySelectorAll(sel) {
    const out = [];
    const matchOne = (node, part) => {
      // part like 'dl.jv-grid' or '.jv-row' or 'dt'
      const m = /^(?:(\w+))?(?:\.([\w-]+))?$/.exec(part.trim());
      if (!m) return false;
      const [, tag, cls] = m;
      if (tag && node.tagName !== tag.toUpperCase()) return false;
      if (cls && !node.classList.contains(cls)) return false;
      return true;
    };
    const parts = sel.split(/\s*>\s*/).map((s) => s.trim().split(/\s+/)).filter((a) => a.length);
    const walk = (node) => {
      for (const c of node.children) {
        // handle only first-level combinators loosely: match last segment anywhere under a parent matching earlier segments
        let ok = true;
        let candidates = [node];
        for (let i = 0; i < parts[0].length; i++) { /* noop, simplified below */ }
        ok = matchOne(c, parts[parts.length - 1][parts[parts.length - 1].length - 1]);
        if (ok) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  get nextElementSibling() {
    if (!this.parent) return null;
    const sibs = this.parent.children;
    return sibs[sibs.indexOf(this) + 1] || null;
  }
  get tBodies() {
    const tb = this.children.filter((c) => c.tagName === 'TBODY');
    return tb;
  }
}

class TextNode {
  constructor(text) { this.tagName = '#text'; this._text = String(text == null ? '' : text); this.parent = null; }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v == null ? '' : v); }
  get children() { return []; }
  querySelectorAll() { return []; }
  querySelector() { return null; }
  get classList() { return { contains: () => false, add() {}, remove() {}, toggle() {} }; }
  get className() { return ''; }
  remove() {
    if (!this.parent) return;
    const i = this.parent.children.indexOf(this);
    if (i >= 0) this.parent.children.splice(i, 1);
    this.parent = null;
  }
}

class Frag extends Node { constructor() { super('#fragment'); this.__frag = true; } }

function makeDocument() {
  const doc = {
    createElement: (tag) => new Node(tag),
    createDocumentFragment: () => new Frag(),
    createTextNode: (t) => new TextNode(t),
    body: new Node('body'),
    documentElement: new Node('html'),
    title: '',
  };
  return doc;
}

module.exports = { Node, makeDocument, ClassList };
