const crypto = require('node:crypto');
const {
  normalizeGitHubAccount,
  normalizeGitHubInstallationId,
  verifyGitHubWebhookSignature,
} = require('../domain/githubIntegration');
const { HttpError } = require('../lib/httpError');

const GITHUB_API_VERSION = '2022-11-28';
const MAX_REPOSITORY_PAGES = 10;
const MAX_GITHUB_JSON_BYTES = 8 * 1024 * 1024;
const GIT_SHA_PATTERN = /^[a-f0-9]{40,64}$/i;
const REPOSITORY_FULL_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function assertHttpsUrl(value, field) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError(`${field} must be a valid URL.`);
  }
  if (parsed.protocol !== 'https:') {
    throw new TypeError(`${field} must use HTTPS.`);
  }
  return parsed.toString().replace(/\/$/, '');
}

function createGitHubAppJwt(appId, privateKeyPem, nowMs = Date.now()) {
  if ((!Number.isSafeInteger(appId) && typeof appId !== 'string') || String(appId).length === 0) {
    throw new TypeError('GitHub App ID is required.');
  }
  if (typeof privateKeyPem !== 'string' || !privateKeyPem.includes('PRIVATE KEY')) {
    throw new TypeError('GitHub App private key PEM is required.');
  }

  const nowSeconds = Math.floor(nowMs / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iat: nowSeconds - 60,
    exp: nowSeconds + 540,
    iss: String(appId),
  }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKeyPem).toString('base64url');
  return `${signingInput}.${signature}`;
}

function normalizeInstallationPayload(value) {
  if (!value || typeof value !== 'object') {
    throw new HttpError(502, 'GitHub installation response is invalid.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
  }
  const installationId = normalizeGitHubInstallationId(value.id);
  const account = normalizeGitHubAccount(value.account);
  const repositorySelection = ['all', 'selected'].includes(value.repository_selection)
    ? value.repository_selection
    : null;
  return {
    installationId,
    accountId: account.id,
    accountLogin: account.login,
    accountType: account.type,
    repositorySelection,
    suspendedAt: typeof value.suspended_at === 'string' ? value.suspended_at : null,
  };
}

function normalizeRepository(value) {
  if (!value || typeof value !== 'object') return null;
  if (!Number.isSafeInteger(value.id) || value.id <= 0) return null;
  if (typeof value.full_name !== 'string' || value.full_name.length < 3 || value.full_name.length > 255) return null;
  return {
    id: value.id,
    fullName: value.full_name,
    private: value.private === true,
    archived: value.archived === true,
    disabled: value.disabled === true,
    defaultBranch: typeof value.default_branch === 'string' ? value.default_branch : null,
  };
}

function splitRepositoryFullName(fullName) {
  if (typeof fullName !== 'string' || !REPOSITORY_FULL_NAME_PATTERN.test(fullName)) {
    throw new HttpError(422, 'GitHub repository name is invalid.', 'GITHUB_REPOSITORY_METADATA_INVALID');
  }
  const [owner, repo] = fullName.split('/');
  return { owner, repo };
}

function normalizeGitTree(payload) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.sha !== 'string' ||
    !GIT_SHA_PATTERN.test(payload.sha) ||
    !Array.isArray(payload.tree)
  ) {
    throw new HttpError(502, 'GitHub repository tree response is invalid.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
  }
  if (payload.truncated === true) {
    throw new HttpError(
      422,
      'GitHub repository tree exceeds the current complete-tree boundary.',
      'GITHUB_REPOSITORY_TREE_TRUNCATED',
    );
  }

  const entries = payload.tree.map((entry) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.path !== 'string' ||
      entry.path.length < 1 ||
      entry.path.length > 1000 ||
      !['blob', 'tree', 'commit'].includes(entry.type) ||
      typeof entry.sha !== 'string' ||
      !GIT_SHA_PATTERN.test(entry.sha)
    ) {
      throw new HttpError(502, 'GitHub repository tree entry is invalid.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
    }
    const size = entry.type === 'blob' && Number.isSafeInteger(entry.size) && entry.size >= 0
      ? entry.size
      : null;
    return { path: entry.path, type: entry.type, sha: entry.sha, size };
  });

  return { treeSha: payload.sha, entries };
}

function createGitHubAppProvider({
  appId,
  appSlug,
  privateKeyPem,
  webhookSecret,
  apiBaseUrl = 'https://api.github.com',
  webBaseUrl = 'https://github.com',
}) {
  if (typeof appSlug !== 'string' || !/^[a-z0-9-]{1,100}$/.test(appSlug)) {
    throw new TypeError('GitHub App slug is invalid.');
  }
  const apiBase = assertHttpsUrl(apiBaseUrl, 'GitHub API base URL');
  const webBase = assertHttpsUrl(webBaseUrl, 'GitHub web base URL');

  async function githubFetch(path, {
    method = 'GET',
    token,
    body,
    maxResponseBytes = MAX_GITHUB_JSON_BYTES,
  } = {}) {
    let response;
    try {
      response = await fetch(`${apiBase}${path}`, {
        method,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
          'User-Agent': 'GuardAI-Repository-Integration/0.1',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw new HttpError(502, 'GitHub API could not be reached.', 'GITHUB_PROVIDER_UNAVAILABLE');
    }

    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
      throw new HttpError(422, 'GitHub API response exceeds GuardAI size limits.', 'GITHUB_PROVIDER_RESPONSE_TOO_LARGE');
    }

    let payload = null;
    if (response.status !== 204) {
      let bytes;
      try {
        bytes = Buffer.from(await response.arrayBuffer());
      } catch {
        throw new HttpError(502, 'GitHub API returned an unreadable response.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
      }
      if (bytes.length > maxResponseBytes) {
        throw new HttpError(422, 'GitHub API response exceeds GuardAI size limits.', 'GITHUB_PROVIDER_RESPONSE_TOO_LARGE');
      }
      try {
        payload = JSON.parse(bytes.toString('utf8'));
      } catch {
        throw new HttpError(502, 'GitHub API returned an invalid response.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
      }
    }
    if (!response.ok) {
      const status = response.status === 404 ? 404 : response.status === 403 ? 403 : 502;
      throw new HttpError(status, 'GitHub API request failed.', 'GITHUB_PROVIDER_REQUEST_FAILED');
    }
    return payload;
  }

  function createAppJwt() {
    return createGitHubAppJwt(appId, privateKeyPem);
  }

  function getInstallationUrl(state) {
    if (typeof state !== 'string' || state.length < 20 || state.length > 200) {
      throw new TypeError('GitHub installation state is invalid.');
    }
    const url = new URL(`/apps/${appSlug}/installations/new`, `${webBase}/`);
    url.searchParams.set('state', state);
    return url.toString();
  }

  async function getInstallation(installationId) {
    const id = normalizeGitHubInstallationId(installationId);
    const payload = await githubFetch(`/app/installations/${id}`, { token: createAppJwt() });
    return normalizeInstallationPayload(payload);
  }

  async function createInstallationAccessToken(installationId) {
    const id = normalizeGitHubInstallationId(installationId);
    const payload = await githubFetch(`/app/installations/${id}/access_tokens`, {
      method: 'POST',
      token: createAppJwt(),
    });
    if (
      !payload ||
      typeof payload.token !== 'string' ||
      payload.token.length < 20 ||
      typeof payload.expires_at !== 'string'
    ) {
      throw new HttpError(502, 'GitHub installation token response is invalid.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
    }
    const expiresAt = new Date(payload.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      throw new HttpError(502, 'GitHub installation token expiration is invalid.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
    }
    return { token: payload.token, expiresAt: expiresAt.toISOString() };
  }

  async function listInstallationRepositories(installationId) {
    const access = await createInstallationAccessToken(installationId);
    const repositories = [];
    for (let page = 1; page <= MAX_REPOSITORY_PAGES; page += 1) {
      const payload = await githubFetch(`/installation/repositories?per_page=100&page=${page}`, {
        token: access.token,
      });
      if (!payload || !Array.isArray(payload.repositories)) {
        throw new HttpError(502, 'GitHub repository list response is invalid.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
      }
      repositories.push(...payload.repositories.map(normalizeRepository).filter(Boolean));
      if (payload.repositories.length < 100) break;
      if (page === MAX_REPOSITORY_PAGES) {
        throw new HttpError(
          422,
          'GitHub installation has more repositories than the current GuardAI sync budget.',
          'GITHUB_REPOSITORY_SYNC_LIMIT',
        );
      }
    }
    return repositories;
  }

  async function openRepositoryReader(installationId, fullName) {
    const id = normalizeGitHubInstallationId(installationId);
    const { owner, repo } = splitRepositoryFullName(fullName);
    const access = await createInstallationAccessToken(id);

    async function resolveSnapshot(ref) {
      if (typeof ref !== 'string' || ref.length < 1 || ref.length > 255) {
        throw new HttpError(422, 'GitHub repository ref is invalid.', 'GITHUB_REPOSITORY_REF_INVALID');
      }
      const commitPayload = await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}`,
        { token: access.token, maxResponseBytes: 512 * 1024 },
      );
      const commitSha = commitPayload?.sha;
      const treeSha = commitPayload?.commit?.tree?.sha;
      if (
        typeof commitSha !== 'string' ||
        !GIT_SHA_PATTERN.test(commitSha) ||
        typeof treeSha !== 'string' ||
        !GIT_SHA_PATTERN.test(treeSha)
      ) {
        throw new HttpError(502, 'GitHub commit response is invalid.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
      }

      const treePayload = await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${treeSha}?recursive=1`,
        { token: access.token },
      );
      const tree = normalizeGitTree(treePayload);
      if (tree.treeSha.toLowerCase() !== treeSha.toLowerCase()) {
        throw new HttpError(502, 'GitHub tree identity did not match the resolved commit.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
      }
      return { commitSha, treeSha, entries: tree.entries };
    }

    async function readBlob(blobSha, expectedMaxBytes) {
      if (typeof blobSha !== 'string' || !GIT_SHA_PATTERN.test(blobSha)) {
        throw new HttpError(422, 'GitHub blob SHA is invalid.', 'GITHUB_BLOB_ID_INVALID');
      }
      if (!Number.isInteger(expectedMaxBytes) || expectedMaxBytes < 1 || expectedMaxBytes > 1024 * 1024) {
        throw new TypeError('GitHub blob read limit must be between 1 byte and 1 MiB.');
      }

      const payload = await githubFetch(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${blobSha}`,
        { token: access.token, maxResponseBytes: Math.min(MAX_GITHUB_JSON_BYTES, expectedMaxBytes * 2 + 32 * 1024) },
      );
      if (
        !payload ||
        payload.encoding !== 'base64' ||
        typeof payload.content !== 'string' ||
        !Number.isSafeInteger(payload.size) ||
        payload.size < 0 ||
        payload.size > expectedMaxBytes
      ) {
        throw new HttpError(422, 'GitHub blob exceeds or violates GuardAI read limits.', 'GITHUB_BLOB_READ_LIMIT');
      }
      const bytes = Buffer.from(payload.content.replace(/\s+/g, ''), 'base64');
      if (bytes.length !== payload.size || bytes.length > expectedMaxBytes) {
        throw new HttpError(502, 'GitHub blob payload size is inconsistent.', 'GITHUB_PROVIDER_RESPONSE_INVALID');
      }
      return bytes;
    }

    return { resolveSnapshot, readBlob };
  }

  function verifyWebhook(rawBody, signatureHeader) {
    return verifyGitHubWebhookSignature(rawBody, signatureHeader, webhookSecret);
  }

  return {
    createAppJwt,
    createInstallationAccessToken,
    getInstallation,
    getInstallationUrl,
    listInstallationRepositories,
    openRepositoryReader,
    verifyWebhook,
  };
}

module.exports = {
  createGitHubAppJwt,
  createGitHubAppProvider,
  GITHUB_API_VERSION,
  GIT_SHA_PATTERN,
  MAX_GITHUB_JSON_BYTES,
  MAX_REPOSITORY_PAGES,
  normalizeGitTree,
  normalizeInstallationPayload,
  normalizeRepository,
  REPOSITORY_FULL_NAME_PATTERN,
  splitRepositoryFullName,
};
