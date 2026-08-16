const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateRetentionExpiry,
  createMarketingConfirmationToken,
  leadSubmissionFingerprint,
  normalizeLeadIdempotencyKey,
  normalizeLeadSubmission,
} = require('../domain/leadCapture');


test('lead submission normalizes email and bounded optional fields', () => {
  const result = normalizeLeadSubmission({
    email: '  User@Example.COM ',
    name: ' Ada ',
    company: ' Example GmbH ',
    message: ' Bitte kontaktieren. ',
  });
  assert.deepEqual(result, {
    email: 'user@example.com',
    name: 'Ada',
    company: 'Example GmbH',
    message: 'Bitte kontaktieren.',
    source: 'website_contact',
    marketingOptIn: false,
  });
});


test('invalid email and oversized content fail closed', () => {
  assert.throws(
    () => normalizeLeadSubmission({ email: 'not-an-email' }),
    (error) => error.code === 'INVALID_LEAD_EMAIL',
  );
  assert.throws(
    () => normalizeLeadSubmission({ email: 'user@example.com', message: 'x'.repeat(2001) }),
    (error) => error.code === 'INVALID_LEAD_INPUT',
  );
});


test('lead Idempotency-Key is required and whitespace-free', () => {
  assert.equal(normalizeLeadIdempotencyKey('lead-request-123'), 'lead-request-123');
  assert.throws(
    () => normalizeLeadIdempotencyKey(undefined),
    (error) => error.code === 'LEAD_IDEMPOTENCY_KEY_REQUIRED',
  );
  assert.throws(
    () => normalizeLeadIdempotencyKey('lead request 123'),
    (error) => error.code === 'INVALID_LEAD_IDEMPOTENCY_KEY',
  );
});


test('lead fingerprint is deterministic but changes with logical content', () => {
  const first = normalizeLeadSubmission({ email: 'user@example.com', message: 'Hallo' });
  const second = normalizeLeadSubmission({ email: 'USER@example.com', message: 'Hallo' });
  assert.equal(leadSubmissionFingerprint(first), leadSubmissionFingerprint(second));
  assert.notEqual(
    leadSubmissionFingerprint(first),
    leadSubmissionFingerprint({ ...first, message: 'Andere Anfrage' }),
  );
  assert.match(leadSubmissionFingerprint(first), /^[a-f0-9]{64}$/);
});


test('retention expiry is explicit and bounded', () => {
  const nowMs = Date.UTC(2026, 7, 16, 18, 0, 0);
  assert.equal(
    calculateRetentionExpiry(30, nowMs),
    new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString(),
  );
  assert.throws(() => calculateRetentionExpiry(0, nowMs));
  assert.throws(() => calculateRetentionExpiry(3651, nowMs));
});


test('future marketing confirmation token stores only a hashable random secret and expiry', () => {
  const nowMs = Date.UTC(2026, 7, 16, 18, 0, 0);
  const result = createMarketingConfirmationToken(24, nowMs);
  assert.match(result.token, /^[A-Za-z0-9_-]+$/);
  assert.match(result.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(result.expiresAt, new Date(nowMs + 24 * 60 * 60 * 1000).toISOString());
});
