const { HttpError } = require('../lib/httpError');
const { createGitHubAppProvider } = require('./githubAppProvider');

let runtime = null;

function resolveGitHubRuntimeConfig(env = process.env) {
  const appIdRaw = String(env.GITHUB_APP_ID || '').trim();
  const appId = /^\d+$/.test(appIdRaw) ? Number(appIdRaw) : null;
  const appSlug = String(env.GITHUB_APP_SLUG || '').trim().toLowerCase();
  const privateKeyBase64 = String(env.GITHUB_APP_PRIVATE_KEY_BASE64 || '').trim();
  const webhookSecret = String(env.GITHUB_APP_WEBHOOK_SECRET || '');

  let privateKeyPem = '';
  if (privateKeyBase64) {
    try {
      privateKeyPem = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
    } catch {
      privateKeyPem = '';
    }
  }

  const configured =
    Number.isSafeInteger(appId) &&
    appId > 0 &&
    /^[a-z0-9-]{1,100}$/.test(appSlug) &&
    privateKeyPem.includes('PRIVATE KEY') &&
    webhookSecret.length >= 16;

  return {
    configured,
    appId,
    appSlug,
    privateKeyPem,
    webhookSecret,
  };
}

function createGitHubRuntime(env = process.env) {
  const config = resolveGitHubRuntimeConfig(env);
  if (!config.configured) {
    return { configured: false, provider: null };
  }
  return {
    configured: true,
    provider: createGitHubAppProvider({
      appId: config.appId,
      appSlug: config.appSlug,
      privateKeyPem: config.privateKeyPem,
      webhookSecret: config.webhookSecret,
    }),
  };
}

function getGitHubRuntime() {
  if (!runtime) runtime = createGitHubRuntime();
  return runtime;
}

function requireGitHubProvider() {
  const current = getGitHubRuntime();
  if (!current.configured || !current.provider) {
    throw new HttpError(503, 'GuardAI GitHub App integration is not configured.', 'GITHUB_INTEGRATION_NOT_CONFIGURED');
  }
  return current.provider;
}

module.exports = {
  createGitHubRuntime,
  getGitHubRuntime,
  requireGitHubProvider,
  resolveGitHubRuntimeConfig,
};
