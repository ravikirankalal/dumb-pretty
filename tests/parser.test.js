// Tests for parser.js + util.js (M2).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { loadJV, structuredClone } = require('./harness');

const { JV } = loadJV(['util.js', 'parser.js']);

test('parses valid object JSON', () => {
  const r = JV.parseJson('{"a":1,"b":[true,null,"x"]}', 5e6);
  assert.equal(r.ok, true);
  assert.deepEqual(structuredClone(r.value.b), [true, null, 'x']);
});

test('rejects malformed JSON', () => {
  const r = JV.parseJson('{"a":1,,}', 5e6);
  assert.equal(r.ok, false);
  assert.match(r.error, /parse-error/);
});

test('rejects primitive roots (bare string/number)', () => {
  assert.equal(JV.parseJson('"hello"', 5e6).ok, false);
  assert.equal(JV.parseJson('42', 5e6).error, 'primitive-root');
});

test('rejects non-JSON-looking text quickly', () => {
  const r = JV.parseJson('<html><body>hi</body></html>', 5e6);
  assert.equal(r.ok, false);
});

test('size guard returns too-large with size', () => {
  const big = JSON.stringify({ data: 'x'.repeat(1000) });
  const r = JV.parseJson(big, 100);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'too-large');
  assert.ok(r.size > 100);
});

test('sanitizer strips prototype-pollution keys', () => {
  const src = '{"a":1,"__proto__":{"polluted":true},"constructor":{"x":1},"nested":{"prototype":{"y":2},"ok":3}}';
  const r = JV.parseJson(src, 5e6);
  assert.equal(r.ok, true);
  assert.equal('polluted' in {}, false);
  assert.equal(Object.prototype.hasOwnProperty.call(r.value, '__proto__'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(r.value, 'constructor'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(r.value.nested, 'prototype'), false);
  assert.equal(r.value.nested.ok, 3);
});

test('big integers are tracked from source', () => {
  const r = JV.parseJson('{"id": 12345678901234567890, "small": 42}', 5e6);
  assert.equal(r.ok, true);
  assert.ok(r.bigNumbers.has('12345678901234567890'));
});

test('isJsonMime covers common variants', () => {
  assert.ok(JV.isJsonMime('application/json'));
  assert.ok(JV.isJsonMime('application/json; charset=utf-8'));
  assert.ok(JV.isJsonMime('text/json'));
  assert.ok(JV.isJsonMime('application/problem+json'));
  assert.ok(!JV.isJsonMime('text/html'));
  assert.ok(!JV.isJsonMime('application/xml'));
});

test('isOriginDisabled matches exact and subdomains', () => {
  const s = { disabledOrigins: ['corp.example'] };
  assert.ok(JV.isOriginDisabled(s, 'corp.example'));
  assert.ok(JV.isOriginDisabled(s, 'api.corp.example'));
  assert.ok(!JV.isOriginDisabled(s, 'notcorp.example'));
});

test('looksLikeDate / looksLikeUrl', () => {
  assert.ok(JV.looksLikeDate('2026-09-25T10:00:00Z'));
  assert.ok(!JV.looksLikeDate('2026-99-99'));
  assert.ok(JV.looksLikeUrl('https://example.com/a?b=1'));
  assert.ok(!JV.looksLikeUrl('javascript:alert(1)'));
});
