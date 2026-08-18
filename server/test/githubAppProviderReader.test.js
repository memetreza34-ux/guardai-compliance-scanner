const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createGitHubAppProvider } = require('../integrations/githubAppProvider');

function privateKeyPem() {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  return privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function createProvider() {
  return createGitHubAppProvider({
    appId: 12345,
    appSlug: 'guardai-test',
    privateKeyPem: privateKeyPem(),
    webhookSecret: 'github-webhook-secret-12345',
  });
}

test('repository reader resolves a branch to immutable commit/tree and reads bounded blob bytes', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  const commitSha = 'a'.repeat(40);
  const treeSha = 'b'.repeat(40);
  const blobSha = 'c'.repeat(40);
  const blob = Buffer.from('export const answer = 42;\n');
  const requests = [];

  global.fetch = async (url, options = {}) => {
    const value = String(url);
    requests.push([value, options.method || 'GET']);
    if (value.endsWith('/app/installations/9876/access_tokens')) {
      return jsonResponse({ token: 'ghs_test_installation_token_1234567890', expires_at: '2099-01-01T00:00:00Z' });
    }
    if (value.endsWith('/repos/example/repo/commits/main')) {
      return jsonResponse({ sha: commitSha, commit: { tree: { sha: treeSha } } });
    }
    if (value.endsWith(`/repos/example/repo/git/trees/${treeSha}?recursive=1`)) {
      return jsonResponse({
        sha: treeSha,
        truncated: false,
        tree: [{ path: 'src/index.ts', type: 'blob', sha: blobSha, size: blob.length }],
      });
    }
    if (value.endsWith(`/repos/example/repo/git/blobs/${blobSha}`)) {
      return jsonResponse({
        sha: blobSha,
        encoding: 'base64',
        size: blob.length,
        content: blob.toString('base64'),
      });
    }
    return jsonResponse({ message: 'not found' }, 404);
  };

  const reader = await createProvider().openRepositoryReader(9876, 'example/repo');
  const snapshot = await reader.resolveSnapshot('main');
  const bytes = await reader.readBlob(blobSha, 1024);

  assert.equal(snapshot.commitSha, commitSha);
  assert.equal(snapshot.treeSha, treeSha);
  assert.deepEqual(snapshot.entries, [
    { path: 'src/index.ts', type: 'blob', sha: blobSha, size: blob.length },
  ]);
  assert.deepEqual(bytes, blob);
  assert.equal(requests.filter(([url]) => url.includes('/access_tokens')).length, 1);
  assert.ok(requests.some(([url]) => url.endsWith('/commits/main')));
  assert.ok(requests.some(([url]) => url.includes('/git/trees/')));
  assert.ok(requests.some(([url]) => url.includes('/git/blobs/')));
});

test('repository reader fails closed when GitHub reports a truncated recursive tree', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  const commitSha = 'd'.repeat(40);
  const treeSha = 'e'.repeat(40);

  global.fetch = async (url) => {
    const value = String(url);
    if (value.endsWith('/app/installations/9876/access_tokens')) {
      return jsonResponse({ token: 'ghs_test_installation_token_1234567890', expires_at: '2099-01-01T00:00:00Z' });
    }
    if (value.endsWith('/repos/example/repo/commits/main')) {
      return jsonResponse({ sha: commitSha, commit: { tree: { sha: treeSha } } });
    }
    if (value.endsWith(`/repos/example/repo/git/trees/${treeSha}?recursive=1`)) {
      return jsonResponse({ sha: treeSha, truncated: true, tree: [] });
    }
    return jsonResponse({ message: 'not found' }, 404);
  };

  const reader = await createProvider().openRepositoryReader(9876, 'example/repo');
  await assert.rejects(
    () => reader.resolveSnapshot('main'),
    (error) => error.code === 'GITHUB_REPOSITORY_TREE_TRUNCATED' && error.statusCode === 422,
  );
});

test('blob reader rejects provider payload larger than the caller budget', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  const blobSha = 'f'.repeat(40);
  const oversized = Buffer.from('x'.repeat(65));

  global.fetch = async (url) => {
    const value = String(url);
    if (value.endsWith('/app/installations/9876/access_tokens')) {
      return jsonResponse({ token: 'ghs_test_installation_token_1234567890', expires_at: '2099-01-01T00:00:00Z' });
    }
    if (value.endsWith(`/repos/example/repo/git/blobs/${blobSha}`)) {
      return jsonResponse({
        sha: blobSha,
        encoding: 'base64',
        size: oversized.length,
        content: oversized.toString('base64'),
      });
    }
    return jsonResponse({ message: 'not found' }, 404);
  };

  const reader = await createProvider().openRepositoryReader(9876, 'example/repo');
  await assert.rejects(
    () => reader.readBlob(blobSha, 64),
    (error) => error.code === 'GITHUB_BLOB_READ_LIMIT' && error.statusCode === 422,
  );
});
