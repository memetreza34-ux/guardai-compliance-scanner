const test = require('node:test');
const assert = require('node:assert/strict');
const { createFindingLifecycleService } = require('../services/findingLifecycleService');


test('Finding lookup happens only after viewer authorization', async () => {
  const calls = [];
  const service = createFindingLifecycleService({
    organizationAuthorization: {
      async requireRole(organizationId, userId, role) {
        calls.push(['auth', organizationId, userId, role]);
      },
    },
    findingRepository: {
      async getFinding() {
        calls.push(['lookup']);
        return { id: 'finding-1', status: 'open' };
      },
    },
  });

  await service.get({ organizationId: 'org-1', userId: 'user-1', findingId: 'finding-1' });
  assert.deepEqual(calls, [
    ['auth', 'org-1', 'user-1', 'viewer'],
    ['lookup'],
  ]);
});


test('status mutation first proves membership then escalates required role', async () => {
  const calls = [];
  const service = createFindingLifecycleService({
    organizationAuthorization: {
      async requireRole(organizationId, userId, role) {
        calls.push(['auth', role]);
      },
    },
    findingRepository: {
      async getFinding() {
        calls.push(['lookup']);
        return { id: 'finding-1', status: 'open' };
      },
      async transitionStatus(input) {
        calls.push(['transition', input.nextStatus]);
        return { id: 'finding-1', status: input.nextStatus };
      },
    },
  });

  await service.updateStatus({
    organizationId: 'org-1',
    userId: 'user-1',
    findingId: 'finding-1',
    status: 'accepted_risk',
    reason: 'Reviewed by the security owner and accepted until migration completion.',
  });

  assert.deepEqual(calls, [
    ['auth', 'viewer'],
    ['lookup'],
    ['auth', 'admin'],
    ['transition', 'accepted_risk'],
  ]);
});