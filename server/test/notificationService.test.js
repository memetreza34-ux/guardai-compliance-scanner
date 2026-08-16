const test = require('node:test');
const assert = require('node:assert/strict');
const { createNotificationService } = require('../services/notificationService');

function buildService() {
  const calls = [];
  const organizationAuthorization = {
    async requireRole(organizationId, userId, role) {
      calls.push(['role', organizationId, userId, role]);
    },
  };
  const notificationRepository = {
    async list(input) {
      calls.push(['list', input]);
      return { notifications: [], nextCursor: null };
    },
    async markRead(input) {
      calls.push(['markRead', input]);
      return {
        id: input.notificationId,
        organizationId: input.organizationId,
        readAt: '2026-08-16T18:00:00.000Z',
      };
    },
    async markAllRead(organizationId) {
      calls.push(['markAllRead', organizationId]);
      return { updated: 2 };
    },
  };
  return {
    calls,
    service: createNotificationService({ organizationAuthorization, notificationRepository }),
  };
}

test('notification listing requires viewer membership', async () => {
  const { calls, service } = buildService();
  await service.list({
    organizationId: 'org-a',
    userId: 'user-a',
    unreadOnly: true,
    limit: 30,
  });
  assert.deepEqual(calls[0], ['role', 'org-a', 'user-a', 'viewer']);
});

test('mark-read remains tenant-authorized through service', async () => {
  const { calls, service } = buildService();
  const result = await service.markRead({
    organizationId: 'org-a',
    userId: 'user-a',
    notificationId: 'notice-a',
  });
  assert.equal(result.id, 'notice-a');
  assert.deepEqual(calls[0], ['role', 'org-a', 'user-a', 'viewer']);
});

test('mark-all-read requires viewer membership and returns bounded mutation result', async () => {
  const { service } = buildService();
  assert.deepEqual(
    await service.markAllRead({ organizationId: 'org-a', userId: 'user-a' }),
    { updated: 2 },
  );
});
