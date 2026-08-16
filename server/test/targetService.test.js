const test = require('node:test');
const assert = require('node:assert/strict');
const { createTargetService } = require('../services/targetService');

function createHarness() {
  const authCalls = [];
  const createCalls = [];
  const service = createTargetService({
    organizationAuthorization: {
      async requireRole(orgId, userId, role) {
        authCalls.push([orgId, userId, role]);
      },
    },
    targetRepository: {
      async createWebsiteTarget(input) {
        createCalls.push(input);
        return { id: 'target-1', ...input, type: 'website', verificationState: 'unverified' };
      },
      async listTargets() {
        return [];
      },
      async getTarget() {
        return { id: 'target-1', verificationState: 'unverified' };
      },
    },
  });

  return { authCalls, createCalls, service };
}

test('creating a website target requires admin and normalizes URL', async () => {
  const harness = createHarness();
  const result = await harness.service.createWebsite({
    organizationId: 'org-1',
    userId: 'user-1',
    url: 'Example.com/path?tracking=1',
    displayName: ' Main Site ',
  });

  assert.deepEqual(harness.authCalls[0], ['org-1', 'user-1', 'admin']);
  assert.equal(harness.createCalls[0].canonicalUrl, 'https://example.com/path');
  assert.equal(harness.createCalls[0].displayName, 'Main Site');
  assert.equal(result.verificationState, 'unverified');
});

test('listing and reading targets require viewer access', async () => {
  const harness = createHarness();
  await harness.service.list({ organizationId: 'org-1', userId: 'user-1' });
  await harness.service.get({ organizationId: 'org-1', targetId: 'target-1', userId: 'user-1' });

  assert.deepEqual(harness.authCalls, [
    ['org-1', 'user-1', 'viewer'],
    ['org-1', 'user-1', 'viewer'],
  ]);
});