const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrganizationService } = require('../services/organizationService');


test('organization service creates an owner workspace with normalized name', async () => {
  const calls = [];
  const service = createOrganizationService({
    organizationRepository: {
      async createOrganizationWithOwner(input) {
        calls.push(input);
        return { id: 'org-1', name: input.name, slug: input.slug, role: 'owner' };
      },
      async listOrganizationsForUser() {
        return [];
      },
    },
  });

  const result = await service.create({ userId: 'user-1', name: '  GuardAI   Team ' });
  assert.equal(result.name, 'GuardAI Team');
  assert.equal(result.role, 'owner');
  assert.equal(calls[0].userId, 'user-1');
  assert.match(calls[0].slug, /^guardai-team-[a-f0-9]{8}$/);
});


test('organization service retries slug collisions only', async () => {
  let attempts = 0;
  const service = createOrganizationService({
    organizationRepository: {
      async createOrganizationWithOwner(input) {
        attempts += 1;
        if (attempts < 3) {
          const error = new Error('collision');
          error.code = 'ORGANIZATION_SLUG_COLLISION';
          throw error;
        }
        return { id: 'org-1', name: input.name, slug: input.slug, role: 'owner' };
      },
      async listOrganizationsForUser() {
        return [];
      },
    },
  });

  await service.create({ userId: 'user-1', name: 'GuardAI' });
  assert.equal(attempts, 3);
});