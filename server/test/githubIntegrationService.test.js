const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { sha256Hex } = require('../lib/evidenceIntegrity');
const { createGitHubIntegrationService } = require('../services/githubIntegrationService');

function createHarness() {
  const calls = [];
  const states = new Map();
  const installations = new Map();
  const organizationAuthorization = {
    async requireRole(organizationId, userId, role) {
      calls.push(['role', organizationId, userId, role]);
    },
  };
  const githubRepository = {
    async createInstallationState(input) {
      calls.push(['createState', input]);
      states.set(input.tokenHash, {
        id: 'state-a',
        organizationId: input.organizationId,
        createdBy: input.userId,
        expiresAt: input.expiresAt,
      });
    },
    async getValidInstallationState(tokenHash) {
      calls.push(['getState', tokenHash]);
      return states.get(tokenHash) || null;
    },
    async consumeStateAndLinkInstallation({ stateId, installation }) {
      calls.push(['link', stateId, installation]);
      const linked = {
        id: 'integration-a',
        organizationId: 'org-a',
        installationId: installation.installationId,
        accountId: installation.accountId,
        accountLogin: installation.accountLogin,
        accountType: installation.accountType,
        repositorySelection: installation.repositorySelection,
        status: installation.suspendedAt ? 'suspended' : 'active',
      };
      installations.set(installation.installationId, linked);
      return linked;
    },
    async getActiveInstallation() {
      return installations.get(9876) || null;
    },
    async findByProviderInstallationId(id) {
      return installations.get(id) || null;
    },
    async claimWebhookEvent(input) {
      calls.push(['claimWebhook', input]);
      return { claimed: true, status: 'processing' };
    },
    async updateInstallationLifecycle(input) {
      calls.push(['lifecycle', input]);
      const existing = installations.get(input.installationId);
      if (!existing) return null;
      const next = { ...existing, status: input.status };
      installations.set(input.installationId, next);
      return next;
    },
    async touchInstallation(id, selection) {
      calls.push(['touch', id, selection]);
    },
    async finalizeWebhookEvent(input) {
      calls.push(['finalize', input]);
    },
  };
  const targetRepository = {
    async syncGitHubInstallationTargets(input) {
      calls.push(['syncTargets', input]);
    },
    async invalidateGitHubInstallationTargets(input) {
      calls.push(['invalidateTargets', input]);
      return 1;
    },
    async createGitHubRepositoryTarget(input) {
      calls.push(['createRepositoryTarget', input]);
      return {
        id: 'target-a',
        organizationId: input.organizationId,
        type: 'repository',
        displayName: input.displayName,
        canonicalUrl: input.canonicalUrl,
        provider: 'github',
        verificationState: 'verified',
        verificationMetadata: {
          githubInstallationId: input.installationId,
          githubRepositoryId: input.repositoryId,
        },
      };
    },
  };
  const secret = 'github-webhook-secret-12345';
  const githubProvider = {
    getInstallationUrl(state) {
      calls.push(['installUrl', state]);
      return `https://github.com/apps/guardai/installations/new?state=${encodeURIComponent(state)}`;
    },
    async getInstallation(id) {
      calls.push(['providerInstallation', id]);
      return {
        installationId: Number(id),
        accountId: 22,
        accountLogin: 'example-org',
        accountType: 'Organization',
        repositorySelection: 'selected',
        suspendedAt: null,
      };
    },
    async listInstallationRepositories(id) {
      calls.push(['repositories', id]);
      return [{
        id: 1,
        fullName: 'example/repo',
        private: true,
        archived: false,
        disabled: false,
        defaultBranch: 'main',
      }];
    },
    verifyWebhook(rawBody, signature) {
      const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
      if (signature !== expected) throw new Error('bad signature');
      return true;
    },
  };
  const service = createGitHubIntegrationService({
    organizationAuthorization,
    githubRepository,
    githubProvider,
    targetRepository,
  });
  return { calls, githubRepository, installations, secret, service, states, targetRepository };
}

function activateInstallation(installations) {
  installations.set(9876, {
    organizationId: 'org-a',
    installationId: 9876,
    repositorySelection: 'selected',
    status: 'active',
  });
}

test('installation start requires admin and stores only state hash', async () => {
  const { calls, service } = createHarness();
  const result = await service.startInstallation({ organizationId: 'org-a', userId: 'user-a' });
  assert.match(result.url, /^https:\/\/github\.com\/apps\/guardai\/installations\/new\?state=/);
  assert.deepEqual(calls[0], ['role', 'org-a', 'user-a', 'admin']);
  const createState = calls.find((entry) => entry[0] === 'createState')[1];
  assert.match(createState.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(result.url.includes(createState.tokenHash), false);
});

test('callback state is hashed, provider installation is verified, then linked', async () => {
  const { service, states } = createHarness();
  const stateToken = 'a'.repeat(43);
  states.set(sha256Hex(stateToken), {
    id: 'state-a',
    organizationId: 'org-a',
    createdBy: 'user-a',
    expiresAt: '2099-01-01T00:00:00.000Z',
  });
  const result = await service.completeInstallation({ stateToken, installationId: '9876' });
  assert.equal(result.installationId, 9876);
  assert.equal(result.accountLogin, 'example-org');
  assert.equal(result.status, 'active');
});

test('repository list requires viewer and synchronizes target authorization', async () => {
  const { calls, installations, service } = createHarness();
  activateInstallation(installations);
  const repositories = await service.listRepositories({ organizationId: 'org-a', userId: 'user-a' });
  assert.equal(repositories[0].fullName, 'example/repo');
  assert.deepEqual(calls[0], ['role', 'org-a', 'user-a', 'viewer']);
  const sync = calls.find((entry) => entry[0] === 'syncTargets');
  assert.deepEqual(sync[1].authorizedRepositoryIds, [1]);
});

test('admin can create Target only from repository currently authorized by provider', async () => {
  const { calls, installations, service } = createHarness();
  activateInstallation(installations);
  const target = await service.createRepositoryTarget({
    organizationId: 'org-a',
    userId: 'user-a',
    repositoryId: 1,
  });
  assert.equal(target.type, 'repository');
  assert.equal(target.provider, 'github');
  assert.equal(target.verificationState, 'verified');
  assert.deepEqual(calls[0], ['role', 'org-a', 'user-a', 'admin']);
  const create = calls.find((entry) => entry[0] === 'createRepositoryTarget');
  assert.equal(create[1].repositoryId, 1);
  assert.equal(create[1].canonicalUrl, 'https://github.com/example/repo');
});

test('repository outside current provider authorization cannot become Target', async () => {
  const { calls, installations, service } = createHarness();
  activateInstallation(installations);
  await assert.rejects(
    () => service.createRepositoryTarget({
      organizationId: 'org-a',
      userId: 'user-a',
      repositoryId: 999,
    }),
    (error) => error.code === 'GITHUB_REPOSITORY_NOT_AUTHORIZED' && error.statusCode === 404,
  );
  assert.equal(calls.some((entry) => entry[0] === 'createRepositoryTarget'), false);
});

test('signed deletion webhook invalidates linked repository Targets', async () => {
  const { calls, installations, secret, service } = createHarness();
  activateInstallation(installations);
  const rawBody = Buffer.from(JSON.stringify({ action: 'deleted', installation: { id: 9876 } }));
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const result = await service.processWebhook({
    rawBody,
    signatureHeader: signature,
    deliveryId: 'delivery-123',
    eventType: 'installation',
  });
  assert.equal(result.status, 'deleted');
  assert.ok(calls.some((entry) => entry[0] === 'lifecycle' && entry[1].status === 'deleted'));
  assert.ok(calls.some((entry) => entry[0] === 'invalidateTargets'));
  assert.ok(calls.some((entry) => entry[0] === 'finalize' && entry[1].status === 'processed'));
});
