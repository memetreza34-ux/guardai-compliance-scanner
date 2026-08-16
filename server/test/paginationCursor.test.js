const test = require('node:test');
const assert = require('node:assert/strict');
const {
  decodeTimestampIdCursor,
  encodeTimestampIdCursor,
} = require('../lib/paginationCursor');

const id = '11111111-1111-4111-8111-111111111111';
const createdAt = '2026-08-16T12:00:00.000Z';

test('timestamp/id pagination cursor round-trips', () => {
  const cursor = encodeTimestampIdCursor(createdAt, id);
  assert.deepEqual(decodeTimestampIdCursor(cursor), { createdAt, id });
});

test('missing cursor maps to null', () => {
  assert.equal(decodeTimestampIdCursor(undefined), null);
  assert.equal(decodeTimestampIdCursor(''), null);
});

test('invalid cursor fails with stable API error', () => {
  assert.throws(
    () => decodeTimestampIdCursor('not-a-valid-payload'),
    (error) => error.code === 'INVALID_PAGINATION_CURSOR' && error.statusCode === 400,
  );
});