const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrganizationAuthorizationService } = require('../services/organizationAuthorization');

function createFakeRepository(memberships) {
  return {
    async getMembership(organizationId, userId) {
      return memberships.find(
        (entry) => entry.organizationId === organizationId && entry.userId === userId,
      ) || null;
    },
  };
}

test('organization authorization rejects non-members', async () => {
  const service = createOrganizationAuthorizationService(createFakeRepository([]));

  await assert.rejects(
    () => service.requireRole('org-a', 'user-a', 'viewer'),
    (error) => error.name === 'HttpError' && error.statusCode === 403,
  );
});

test('organization authorization enforces minimum role', async () => {
  const service = createOrganizationAuthorizationService(createFakeRepository([
    { organizationId: 'org-a', userId: 'user-a', role: 'viewer' },
  ]));

  await assert.rejects(
    () => service.requireRole('org-a', 'user-a', 'member'),
    (error) => error.name === 'HttpError' && error.statusCode === 403,
  );
});

test('organization authorization returns valid membership', async () => {
  const membership = { organizationId: 'org-a', userId: 'user-a', role: 'admin' };
  const service = createOrganizationAuthorizationService(createFakeRepository([membership]));

  assert.deepEqual(await service.requireRole('org-a', 'user-a', 'member'), membership);
});

test('organization authorization fails closed on invalid stored role', async () => {
  const service = createOrganizationAuthorizationService(createFakeRepository([
    { organizationId: 'org-a', userId: 'user-a', role: 'superadmin' },
  ]));

  await assert.rejects(
    () => service.requireRole('org-a', 'user-a', 'viewer'),
    (error) => error.name === 'HttpError' && error.statusCode === 500,
  );
});
