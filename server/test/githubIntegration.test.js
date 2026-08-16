const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  createGitHubInstallationState,
  normalizeGitHubAccount,
  normalizeGitHubInstallationId,
  verifyGitHubWebhookSignature,
} = require('../domain/githubIntegration');
const { createGitHubAppJwt } = require('../integrations/githubAppProvider');


test('GitHub installation state returns raw random token and persistable hash', () => {
  const state = createGitHubInstallationState(Date.UTC(2026, 7, 16, 18, 0, 0));
  assert.match(state.token, /^[A-Za-z0-9_-]+$/);
  assert.match(state.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(state.expiresAt, '2026-08-16T18:15:00.000Z');
});


test('GitHub IDs/accounts are normalized and invalid provider data fails closed', () => {
  assert.equal(normalizeGitHubInstallationId('12345'), 12345);
  assert.deepEqual(
    normalizeGitHubAccount({ id: 44, login: 'example-org', type: 'Organization' }),
    { id: 44, login: 'example-org', type: 'Organization' },
  );
  assert.throws(
    () => normalizeGitHubInstallationId('abc'),
    (error) => error.code === 'GITHUB_INSTALLATION_ID_INVALID',
  );
});


test('GitHub webhook HMAC requires exact raw body', () => {
  const body = Buffer.from('{"action":"suspended"}');
  const secret = 'github-webhook-secret-12345';
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  assert.equal(verifyGitHubWebhookSignature(body, signature, secret), true);
  assert.throws(
    () => verifyGitHubWebhookSignature(Buffer.from('{"action":"deleted"}'), signature, secret),
    (error) => error.code === 'GITHUB_WEBHOOK_SIGNATURE_INVALID',
  );
});


test('GitHub App JWT is RS256-signed and short-lived', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const nowMs = Date.UTC(2026, 7, 16, 18, 0, 0);
  const token = createGitHubAppJwt(12345, privatePem, nowMs);
  const [headerPart, payloadPart, signaturePart] = token.split('.');
  const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
  assert.equal(header.alg, 'RS256');
  assert.equal(payload.iss, '12345');
  assert.equal(payload.exp - payload.iat, 600);
  assert.equal(
    crypto.verify(
      'RSA-SHA256',
      Buffer.from(`${headerPart}.${payloadPart}`),
      publicKey,
      Buffer.from(signaturePart, 'base64url'),
    ),
    true,
  );
});
