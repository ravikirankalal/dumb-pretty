// Tests for analyzer.js shape inference (M2).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadJV, structuredClone } = require('./harness');

const { JV } = loadJV(['util.js', 'parser.js', 'analyzer.js']);

test('object → grid', () => {
  const s = JV.analyzeShape({ a: 1, b: 2 });
  assert.equal(s.kind, 'grid');
  assert.deepEqual(structuredClone(s.keys), ['a', 'b']);
});

test('array of objects → table with union columns', () => {
  const rows = [
    { id: 1, name: 'Ann' },
    { id: 2, email: 'a@x.io' },
    { id: 3, name: 'Bo', email: 'b@x.io' },
  ];
  const s = JV.analyzeShape(rows);
  assert.equal(s.kind, 'table');
  assert.deepEqual(structuredClone(s.columns.map((c) => c.key)), ['id', 'name', 'email']);
  const name = s.columns.find((c) => c.key === 'name');
  assert.equal(name.missing, 1);
  assert.equal(s.columns.find((c) => c.key === 'id').dominantType, 'number');
});

test('≥80% object threshold: below → mixedArray', () => {
  const rows = [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, 'x', 'y']; // 4/6 = 66%
  assert.equal(JV.analyzeShape(rows).kind, 'mixedArray');
  const ok = [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }, 'x']; // 5/6 = 83%
  assert.equal(JV.analyzeShape(ok).kind, 'table');
});

test('array of primitives → list', () => {
  assert.equal(JV.analyzeShape(['a', 'b']).itemType, 'string');
  assert.equal(JV.analyzeShape([1, 2, 3]).itemType, 'number');
  assert.equal(JV.analyzeShape(['a', 1]).itemType, 'mixed');
});

test('array of arrays → nestedList', () => {
  assert.equal(JV.analyzeShape([[1], [2, 3]]).kind, 'nestedList');
});

test('empties', () => {
  assert.equal(JV.analyzeShape([]).kind, 'emptyArray');
  assert.equal(JV.analyzeShape({}).kind, 'emptyObject');
});

test('primitives', () => {
  assert.equal(JV.analyzeShape(5).kind, 'primitive');
  assert.equal(JV.analyzeShape(null).type, 'null');
  assert.equal(JV.analyzeShape(true).type, 'boolean');
});

test('depth cap yields collapsed at MAX_DEPTH', () => {
  assert.equal(JV.analyzeShape({ a: 1 }, JV.MAX_DEPTH).kind, 'collapsed');
});

test('column dominant type tolerates nulls but not mixed types', () => {
  const cols = JV.analyzeColumns([{ v: 1 }, { v: null }, { v: 3 }]);
  assert.equal(cols[0].dominantType, 'number');
  const cols2 = JV.analyzeColumns([{ v: 1 }, { v: 'a' }, { v: true }, { v: 2 }]);
  assert.equal(cols2[0].dominantType, 'mixed');
});

test('complex column flagged hasComplex', () => {
  const cols = JV.analyzeColumns([{ tags: ['a'] }, { tags: ['b'] }]);
  assert.equal(cols[0].hasComplex, true);
});
