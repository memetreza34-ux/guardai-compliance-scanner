const test = require('node:test');
const assert = require('node:assert/strict');
const { createEvidenceService } = require('../services/evidenceService');


test('Evidence Explorer requires viewer role', async () => {
  const calls = [];
  const service = createEvidenceService({
    organizationAuthorization: {
      async requireRole(organizationId, userId, role) {
        calls.push(['auth', organizationId, userId, role]);
      },
    },
    evidenceRepository: {
      async listEvidence(input) {
        calls.push(['list', input]);
        return { evidence: [], nextCursor: null };
      },
      async getEvidence() {
        return { id: 'evidence-1' };
      },
    },
  });

  await service.list({ organizationId: 'org-1', userId: 'user-1' });
  await service.get({ organizationId: 'org-1', userId: 'user-1', evidenceId: 'evidence-1' });

  assert.deepEqual(calls[0], ['auth', 'org-1', 'user-1', 'viewer']);
  assert.deepEqual(calls[2], ['auth', 'org-1', 'user-1', 'viewer']);
});