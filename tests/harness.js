// Loads the extension's classic content scripts into this Node context with a fake DOM.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeDocument } = require('./fake-dom');

function loadJV(scriptNames) {
  const doc = makeDocument();
  const sandbox = {
    document: doc,
    console,
    setTimeout,
    URL: globalThis.URL,
    Blob: class Blob { constructor(parts) { this.parts = parts; } },
    navigator: {},
    location: { hostname: 'api.test', pathname: '/data' },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);
  const base = path.join(__dirname, '..', 'dist', 'content');
  for (const name of scriptNames) {
    const code = fs.readFileSync(path.join(base, name), 'utf8');
    vm.runInContext(code, ctx, { filename: name });
  }
  return { JV: sandbox.JV, document: doc, sandbox };
}

module.exports = { loadJV, structuredClone: globalThis.structuredClone };
