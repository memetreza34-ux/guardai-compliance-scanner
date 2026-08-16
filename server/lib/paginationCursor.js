const { HttpError } = require('./httpError');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function encodeTimestampIdCursor(createdAt, id) {
  const timestamp = createdAt instanceof Date ? createdAt.toISOString() : String(createdAt);
  if (Number.isNaN(Date.parse(timestamp)) || !UUID_PATTERN.test(id)) {
    throw new TypeError('Cursor requires a valid timestamp and UUID.');
  }

  return Buffer.from(JSON.stringify({ createdAt: timestamp, id }), 'utf8').toString('base64url');
}

function decodeTimestampIdCursor(cursor) {
  if (cursor === null || cursor === undefined || cursor === '') return null;
  if (typeof cursor !== 'string' || cursor.length > 500 || !/^[A-Za-z0-9_-]+$/.test(cursor)) {
    throw new HttpError(400, 'Pagination cursor is invalid.', 'INVALID_PAGINATION_CURSOR');
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.createdAt !== 'string' ||
      Number.isNaN(Date.parse(parsed.createdAt)) ||
      typeof parsed.id !== 'string' ||
      !UUID_PATTERN.test(parsed.id)
    ) {
      throw new Error('invalid cursor payload');
    }

    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    throw new HttpError(400, 'Pagination cursor is invalid.', 'INVALID_PAGINATION_CURSOR');
  }
}

module.exports = {
  decodeTimestampIdCursor,
  encodeTimestampIdCursor,
  UUID_PATTERN,
};