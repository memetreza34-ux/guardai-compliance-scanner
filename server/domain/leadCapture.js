const crypto = require('node:crypto');
const { sha256Hex } = require('../lib/evidenceIntegrity');
const { HttpError } = require('../lib/httpError');

const LEAD_SOURCE = 'website_contact';

function normalizeLeadIdempotencyKey(value) {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'Lead Idempotency-Key is required.', 'LEAD_IDEMPOTENCY_KEY_REQUIRED');
  }
  const key = value.trim();
  if (key.length < 8 || key.length > 200 || /[\u0000-\u001f\u007f\s]/.test(key)) {
    throw new HttpError(400, 'Lead Idempotency-Key is invalid.', 'INVALID_LEAD_IDEMPOTENCY_KEY');
  }
  return key;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'A valid email address is required.', 'INVALID_LEAD_EMAIL');
  }
  const email = value.trim().toLowerCase();
  if (
    email.length < 3 ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new HttpError(400, 'A valid email address is required.', 'INVALID_LEAD_EMAIL');
  }
  return email;
}

function optionalText(value, maxLength, field) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} is invalid.`, 'INVALID_LEAD_INPUT');
  }
  const normalized = value.replace(/[\u0000\r]/g, '').trim();
  if (normalized.length < 1 || normalized.length > maxLength) {
    throw new HttpError(400, `${field} is invalid.`, 'INVALID_LEAD_INPUT');
  }
  return normalized;
}

function normalizeLeadSubmission(input) {
  return {
    email: normalizeEmail(input?.email),
    name: optionalText(input?.name, 120, 'Name'),
    company: optionalText(input?.company, 160, 'Company'),
    message: optionalText(input?.message, 2000, 'Message'),
    source: LEAD_SOURCE,
    marketingOptIn: input?.marketingOptIn === true,
  };
}

function calculateRetentionExpiry(retentionDays, nowMs = Date.now()) {
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    throw new TypeError('Lead retention days must be an integer between 1 and 3650.');
  }
  return new Date(nowMs + retentionDays * 24 * 60 * 60 * 1000).toISOString();
}

function createMarketingConfirmationToken(ttlHours, nowMs = Date.now()) {
  if (!Number.isInteger(ttlHours) || ttlHours < 1 || ttlHours > 168) {
    throw new TypeError('Marketing confirmation TTL must be between 1 and 168 hours.');
  }
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: sha256Hex(token),
    expiresAt: new Date(nowMs + ttlHours * 60 * 60 * 1000).toISOString(),
  };
}

function leadSubmissionFingerprint(input) {
  return sha256Hex(JSON.stringify({
    email: input.email,
    name: input.name,
    company: input.company,
    message: input.message,
    source: input.source,
    marketingOptIn: input.marketingOptIn,
  }));
}

module.exports = {
  calculateRetentionExpiry,
  createMarketingConfirmationToken,
  LEAD_SOURCE,
  leadSubmissionFingerprint,
  normalizeEmail,
  normalizeLeadIdempotencyKey,
  normalizeLeadSubmission,
  optionalText,
};
