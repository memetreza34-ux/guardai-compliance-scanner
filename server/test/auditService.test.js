const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuditService } = require('../services/auditService');


test('audit history requires admin role and forwards pagination', async () => {
  const calls = [];
  const service = createAuditService({
    organizationAuthorization: {
      async requireRole(organizationId, userId, role) {
        calls.push(['auth', organizationId, userId, role]);
      },
    },
    auditRepository: {
      async listAuditEvents(input) {
        calls.push(['repo', input]);
        return { events: [], nextCursor: null };
      },
    },
  });

  const page = await service.list({
    organizationId: 'org-1',
    userId: 'user-1',
    limit: '25',
    cursor: 'opaque',
  });

  assert.deepEqual(page, { events: [], nextCursor: null });
  assert.deepEqual(calls[0], ['auth', 'org-1', 'user-1', 'admin']);
  assert.deepEqual(calls[1], [
    'repo',
    { organizationId: 'org-1', limit: '25', cursor: 'opaque' },
  ]);
});