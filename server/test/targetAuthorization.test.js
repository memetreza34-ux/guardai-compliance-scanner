const test = require('node:test');
const assert = require('node:assert/strict');
const { assertTargetVerified } = require('../domain/targetAuthorization');


test('verified target is accepted', () => {
  assert.doesNotThrow(() => assertTargetVerified({ verification_state: 'verified' }));
});


test('unverified and missing targets are rejected', () => {
  assert.throws(
    () => assertTargetVerified({ verification_state: 'pending' }),
    (error) => error.code === 'TARGET_NOT_VERIFIED' && error.statusCode === 403,
  );
  assert.throws(
    () => assertTargetVerified(null),
    (error) => error.code === 'TARGET_NOT_VERIFIED',
  );
});