const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { resolveGitHubRuntimeConfig } = require('../integrations/githubRuntime');

function privateKeyBase64() {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  return Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64');
}


test('GitHub runtime stays disabled when any required secret/config value is missing', () => {
  assert.equal(resolveGitHubRuntimeConfig({}).configured, false);
  assert.equal(resolveGitHubRuntimeConfig({
    GITHUB_APP_ID: '12345',
    GITHUB_APP_SLUG: 'guardai',
    GITHUB_APP_PRIVATE_KEY_BASE64: privateKeyBase64(),
  }).configured, false);
});


test('GitHub runtime accepts complete App configuration and decodes PEM in memory', () => {
  const result = resolveGitHubRuntimeConfig({
    GITHUB_APP_ID: '12345',
    GITHUB_APP_SLUG: 'guardai-security',
    GITHUB_APP_PRIVATE_KEY_BASE64: privateKeyBase64(),
    GITHUB_APP_WEBHOOK_SECRET: 'github-webhook-secret-12345',
  });
  assert.equal(result.configured, true);
  assert.equal(result.appId, 12345);
  assert.equal(result.appSlug, 'guardai-security');
  assert.match(result.privateKeyPem, /PRIVATE KEY/);
});


test('malformed App ID, slug or private key leaves integration fail-closed', () => {
  assert.equal(resolveGitHubRuntimeConfig({
    GITHUB_APP_ID: 'abc',
    GITHUB_APP_SLUG: 'Bad Slug',
    GITHUB_APP_PRIVATE_KEY_BASE64: Buffer.from('not a key').toString('base64'),
    GITHUB_APP_WEBHOOK_SECRET: 'github-webhook-secret-12345',
  }).configured, false);
});
