const test = require('node:test');
const assert = require('node:assert/strict');
const { getBearerToken } = require('../auth/supabaseAuth');

test('getBearerToken extracts a standard bearer token', () => {
  assert.equal(getBearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
});

test('getBearerToken accepts bearer scheme case-insensitively', () => {
  assert.equal(getBearerToken('bearer token-value'), 'token-value');
});

test('getBearerToken rejects malformed or missing auth headers', () => {
  assert.equal(getBearerToken(undefined), null);
  assert.equal(getBearerToken(''), null);
  assert.equal(getBearerToken('Basic abc'), null);
  assert.equal(getBearerToken('Bearer'), null);
});
