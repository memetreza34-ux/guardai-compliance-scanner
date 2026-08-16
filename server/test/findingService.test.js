const test = require('node:test');
const assert = require('node:assert/strict');
const { createFindingService } = require('../services/findingService');

function createHarness(currentStatus = 'open') {
  const calls = [];
  const current = {
    id: 'finding-1',
    organizationId: 'org-1',
    status: currentStatus,
  };
  const service = createFindingService({
    organizationAuthorization: {
      async requireRole(organizationId, userId, role) {
        calls.push(['auth', organizationId, userId, role]);
      },
    },
    findingRepository: {
      async getFinding() {
        return current;
      },
      async listFindings(input) {
        calls.push(['list', input]);
        return { findings: [], nextCursor: null };
      },
      async listStatusHistory(input) {
        calls.push(['history', input]);
        return { events: [], nextCursor: null };
      },
      async transitionStatus(input) {
        calls.push(['transition', input]);
        return { ...current, status: input.nextStatus, statusReason: input.reason };
      },
    },
  });
  return { calls, service };
}


test('finding list and history require viewer role', async () => {
  const harness = createHarness();
  await harness.service.list({ organizationId: 'org-1', userId: 'user-1' });
  await harness.service.history({ organizationId: 'org-1', userId: 'user-1', findingId: 'finding-1' });
  assert.deepEqual(harness.calls[0], ['auth', 'org-1', 'user-1', 'viewer']);
  assert.deepEqual(harness.calls[2], ['auth', 'org-1', 'user-1', 'viewer']);
});


test('resolving an open finding requires member role', async () => {
  const harness = createHarness('open');
  const result = await harness.service.updateStatus({
    organizationId: 'org-1',
    userId: 'user-1',
    findingId: 'finding-1',
    status: 'resolved',
    reason: 'Fixed in deployment.',
  });

  assert.deepEqual(harness.calls[0], ['auth', 'org-1', 'user-1', 'member']);
  assert.equal(result.status, 'resolved');
});


test('accepting risk requires admin role and meaningful reason', async () => {
  const harness = createHarness('open');
  await harness.service.updateStatus({
    organizationId: 'org-1',
    userId: 'user-1',
    findingId: 'finding-1',
    status: 'accepted_risk',
    reason: 'Reviewed by security owner; accepted until the planned migration is complete.',
  });

  assert.deepEqual(harness.calls[0], ['auth', 'org-1', 'user-1', 'admin']);
});


test('same-status PATCH is still a member mutation, not viewer-only', async () => {
  const harness = createHarness('resolved');
  await harness.service.updateStatus({
    organizationId: 'org-1',
    userId: 'user-1',
    findingId: 'finding-1',
    status: 'resolved',
  });
  assert.deepEqual(harness.calls[0], ['auth', 'org-1', 'user-1', 'member']);
});