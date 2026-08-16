const crypto = require('node:crypto');
const net = require('node:net');
const { HttpError } = require('../lib/httpError');
const { sha256Hex } = require('../lib/evidenceIntegrity');

const DNS_TOKEN_PREFIX = 'guardai-verification=';
const CHALLENGE_TTL_MINUTES = 30;
const MAX_VERIFICATION_ATTEMPTS = 20;

function extractVerifiableHostname(canonicalUrl) {
  let parsed;
  try {
    parsed = new URL(canonicalUrl);
  } catch {
    throw new HttpError(422, 'Website target has an invalid canonical URL.', 'TARGET_URL_INVALID');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new HttpError(422, 'Website target URL must use HTTP or HTTPS.', 'TARGET_URL_INVALID');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname.length > 253 || net.isIP(hostname) !== 0) {
    throw new HttpError(
      422,
      'DNS verification requires a domain hostname rather than an IP address.',
      'TARGET_DNS_VERIFICATION_UNAVAILABLE',
    );
  }

  return hostname;
}

function createDnsVerificationChallenge(canonicalUrl) {
  const hostname = extractVerifiableHostname(canonicalUrl);
  const token = crypto.randomBytes(32).toString('base64url');

  return {
    method: 'dns_txt',
    token,
    tokenHash: sha256Hex(token),
    dnsRecordName: `_guardai-challenge.${hostname}`,
    dnsRecordValue: `${DNS_TOKEN_PREFIX}${token}`,
    ttlMinutes: CHALLENGE_TTL_MINUTES,
  };
}

function timingSafeHexEqual(left, right) {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) return false;
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function txtRecordsMatchTokenHash(records, tokenHash) {
  if (!Array.isArray(records)) return false;

  return records.some((segments) => {
    if (!Array.isArray(segments)) return false;
    const value = segments.join('');
    if (!value.startsWith(DNS_TOKEN_PREFIX)) return false;
    const candidateToken = value.slice(DNS_TOKEN_PREFIX.length).trim();
    return timingSafeHexEqual(sha256Hex(candidateToken), tokenHash);
  });
}

module.exports = {
  CHALLENGE_TTL_MINUTES,
  createDnsVerificationChallenge,
  DNS_TOKEN_PREFIX,
  extractVerifiableHostname,
  MAX_VERIFICATION_ATTEMPTS,
  timingSafeHexEqual,
  txtRecordsMatchTokenHash,
};