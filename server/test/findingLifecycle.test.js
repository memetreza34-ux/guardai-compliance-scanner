const test = require('node:test');
const assert = require('node:assert/strict');
const {
  minimumRoleForFindingTransition,
  normalizeFindingTransition,
  statusAfterRediscovery,
} = require('../domain/findingLifecycle');


test('ordinary open/resolved transitions require member role', () => {
  assert.equal(minimumRoleForFindingTransition('open', 'resolved'), 'member');
  assert.equal(minimumRoleForFindingTransition('resolved', 'open'), 'member');
});


test('accepted risk transitions require admin role and reason', () => {
  assert.equal(minimumRoleForFindingTransition('open', 'accepted_risk'), 'admin');
  assert.equal(minimumRoleForFindingTransition('accepted_risk', 'open'), 'admin');
  assert.throws(
    () => normalizeFindingTransition({
      currentStatus: 'open',
      nextStatus: 'accepted_risk',
      reason: 'short',
    }),
    (error) => error.code === 'INVALID_FINDING_STATUS_REASON',
  );

  const transition = normalizeFindingTransition({
    currentStatus: 'open',
    nextStatus: 'accepted_risk',
    reason: 'Risk reviewed and temporarily accepted by the organization.',
  });
  assert.equal(transition.minimumRole, 'admin');
  assert.equal(transition.changed, true);
});


test('rediscovery reopens resolved findings but preserves accepted risk', () => {
  assert.equal(statusAfterRediscovery('resolved'), 'open');
  assert.equal(statusAfterRediscovery('open'), 'open');
  assert.equal(statusAfterRediscovery('accepted_risk'), 'accepted_risk');
});


test('idempotent same-status update does not require a new lifecycle event', () => {
  const transition = normalizeFindingTransition({
    currentStatus: 'resolved',
    nextStatus: 'resolved',
    reason: undefined,
  });
  assert.equal(transition.changed, false);
  assert.equal(transition.minimumRole, 'viewer');
});