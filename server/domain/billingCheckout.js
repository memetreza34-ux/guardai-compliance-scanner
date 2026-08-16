const { sha256Hex } = require('../lib/evidenceIntegrity');
const { HttpError } = require('../lib/httpError');

function normalizeCheckoutIdempotencyKey(value) {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'Billing Idempotency-Key is required.', 'BILLING_IDEMPOTENCY_KEY_REQUIRED');
  }
  const key = value.trim();
  if (
    key.length < 8 ||
    key.length > 200 ||
    /[\u0000-\u001f\u007f\s]/.test(key)
  ) {
    throw new HttpError(400, 'Billing Idempotency-Key is invalid.', 'INVALID_BILLING_IDEMPOTENCY_KEY');
  }
  return key;
}

function stripeIdempotencyKey({ organizationId, plan, requestKey, operation }) {
  const digest = sha256Hex(`${organizationId}\u001f${plan}\u001f${requestKey}\u001f${operation}`);
  return `guardai:${operation}:${digest}`;
}

function checkoutExpiryEpochSeconds(nowMs = Date.now()) {
  return Math.floor(nowMs / 1000) + (30 * 60);
}

module.exports = {
  checkoutExpiryEpochSeconds,
  normalizeCheckoutIdempotencyKey,
  stripeIdempotencyKey,
};
