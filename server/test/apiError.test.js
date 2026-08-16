const test = require('node:test');
const assert = require('node:assert/strict');
const { buildApiErrorBody, defaultErrorCode } = require('../lib/apiError');

test('defaultErrorCode maps common HTTP statuses', () => {
  assert.equal(defaultErrorCode(400), 'BAD_REQUEST');
  assert.equal(defaultErrorCode(401), 'UNAUTHORIZED');
  assert.equal(defaultErrorCode(429), 'RATE_LIMITED');
  assert.equal(defaultErrorCode(503), 'SERVICE_UNAVAILABLE');
});

test('buildApiErrorBody produces stable v1 shape', () => {
  assert.deepEqual(
    buildApiErrorBody({
      statusCode: 403,
      code: 'ORG_ACCESS_DENIED',
      message: 'Denied',
    }),
    {
      error: {
        code: 'ORG_ACCESS_DENIED',
        message: 'Denied',
      },
    },
  );
});

test('buildApiErrorBody includes details only when provided', () => {
  assert.deepEqual(
    buildApiErrorBody({
      statusCode: 400,
      message: 'Invalid',
      details: [{ path: ['url'] }],
    }),
    {
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid',
        details: [{ path: ['url'] }],
      },
    },
  );
});
