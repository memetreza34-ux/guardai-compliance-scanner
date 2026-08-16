const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertOrganizationRole,
  isOrganizationRole,
  roleAtLeast,
} = require('../auth/roles');

test('isOrganizationRole accepts only GuardAI roles', () => {
  for (const role of ['owner', 'admin', 'member', 'viewer']) {
    assert.equal(isOrganizationRole(role), true);
  }

  assert.equal(isOrganizationRole('billing'), false);
  assert.equal(isOrganizationRole(undefined), false);
});

test('roleAtLeast follows owner > admin > member > viewer', () => {
  assert.equal(roleAtLeast('owner', 'admin'), true);
  assert.equal(roleAtLeast('admin', 'member'), true);
  assert.equal(roleAtLeast('member', 'viewer'), true);
  assert.equal(roleAtLeast('viewer', 'member'), false);
  assert.equal(roleAtLeast('member', 'admin'), false);
});

test('assertOrganizationRole rejects insufficient roles', () => {
  assert.throws(
    () => assertOrganizationRole('viewer', 'member'),
    (error) => error.name === 'HttpError' && error.statusCode === 403,
  );
});
