const crypto = require('node:crypto');
const { sha256Hex } = require('../lib/evidenceIntegrity');
const { HttpError } = require('../lib/httpError');

const INSTALL_STATE_TTL_MINUTES = 15;

function createGitHubInstallationState(nowMs = Date.now()) {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: sha256Hex(token),
    expiresAt: new Date(nowMs + INSTALL_STATE_TTL_MINUTES * 60 * 1000).toISOString(),
  };
}

function normalizeGitHubInstallationId(value) {
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, 'GitHub installation identifier is invalid.', 'GITHUB_INSTALLATION_ID_INVALID');
  }
  return parsed;
}

function normalizeGitHubAccount(account) {
  if (!account || typeof account !== 'object') {
    throw new HttpError(502, 'GitHub installation account is invalid.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
  }
  const id = account.id;
  const login = account.login || account.name || account.slug;
  const type = account.type || 'Organization';
  if (!Number.isSafeInteger(id) || id <= 0 || typeof login !== 'string' || login.length < 1 || login.length > 255) {
    throw new HttpError(502, 'GitHub installation account is invalid.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
  }
  if (!['User', 'Organization', 'Enterprise'].includes(type)) {
    throw new HttpError(502, 'GitHub installation account type is unsupported.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
  }
  return { id, login, type };
}

function verifyGitHubWebhookSignature(rawBody, signatureHeader, webhookSecret) {
  if (!Buffer.isBuffer(rawBody)) {
    throw new HttpError(400, 'GitHub webhook body must be raw bytes.', 'GITHUB_WEBHOOK_BODY_INVALID');
  }
  if (typeof webhookSecret !== 'string' || webhookSecret.length < 16) {
    throw new HttpError(503, 'GitHub webhook secret is not configured.', 'GITHUB_INTEGRATION_NOT_CONFIGURED');
  }
  if (typeof signatureHeader !== 'string' || !/^sha256=[a-f0-9]{64}$/i.test(signatureHeader)) {
    throw new HttpError(400, 'GitHub webhook signature is missing or invalid.', 'GITHUB_WEBHOOK_SIGNATURE_INVALID');
  }
  const expected = `sha256=${crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')}`;
  const left = Buffer.from(expected, 'utf8');
  const right = Buffer.from(signatureHeader.toLowerCase(), 'utf8');
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    throw new HttpError(400, 'GitHub webhook signature is invalid.', 'GITHUB_WEBHOOK_SIGNATURE_INVALID');
  }
  return true;
}

function normalizeGitHubDeliveryId(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 255 || /[\r\n]/.test(value)) {
    throw new HttpError(400, 'GitHub webhook delivery identifier is invalid.', 'GITHUB_WEBHOOK_DELIVERY_INVALID');
  }
  return value;
}

module.exports = {
  createGitHubInstallationState,
  INSTALL_STATE_TTL_MINUTES,
  normalizeGitHubAccount,
  normalizeGitHubDeliveryId,
  normalizeGitHubInstallationId,
  verifyGitHubWebhookSignature,
};
