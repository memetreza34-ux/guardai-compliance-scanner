const test = require('node:test');
const assert = require('node:assert/strict');
const { createTargetVerificationService } = require('../services/targetVerificationService');
const { sha256Hex } = require('../lib/evidenceIntegrity');

function createHarness({ targetState = 'unverified', dnsRecords = [] } = {}) {
  const calls = [];
  let pending = null;
  const organizationAuthorization = {
    async requireRole(orgId, userId, role) {
      calls.push(['auth', orgId, userId, role]);
    },
  };
  const targetVerificationRepository = {
    async getTarget() {
      return {
        id: 'target-1',
        type: 'website',
        canonical_url: 'https://example.com/',
        verification_state: targetState,
      };
    },
    async createDnsChallenge(input) {
      pending = {
        id: 'challenge-1',
        method: 'dns_txt',
        status: 'pending',
        tokenHash: input.tokenHash,
        dnsRecordName: input.dnsRecordName,
        attemptCount: 0,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      };
      return pending;
    },
    async getPendingChallenge() {
      return pending;
    },
    async recordAttempt(input) {
      pending = {
        ...pending,
        status: input.matched ? 'verified' : 'pending',
        attemptCount: pending.attemptCount + 1,
        lastCheckedAt: new Date().toISOString(),
      };
      return pending;
    },
  };
  const resolveTxt = async () => dnsRecords;

  return {
    calls,
    service: createTargetVerificationService({
      organizationAuthorization,
      targetVerificationRepository,
      resolveTxt,
    }),
    setPending(challenge) {
      pending = challenge;
    },
  };
}


test('starting verification requires admin and returns a one-time DNS value', async () => {
  const harness = createHarness();
  const result = await harness.service.startDnsChallenge({
    organizationId: 'org-1',
    targetId: 'target-1',
    userId: 'user-1',
  });

  assert.deepEqual(harness.calls[0], ['auth', 'org-1', 'user-1', 'admin']);
  assert.equal(result.dnsRecordName, '_guardai-challenge.example.com');
  assert.match(result.dnsRecordValue, /^guardai-verification=/);
});


test('DNS check verifies only a matching hashed token', async () => {
  const token = 'known-token';
  const harness = createHarness({ dnsRecords: [[`guardai-verification=${token}`]] });
  harness.setPending({
    id: 'challenge-1',
    status: 'pending',
    tokenHash: sha256Hex(token),
    dnsRecordName: '_guardai-challenge.example.com',
    attemptCount: 0,
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  });

  const result = await harness.service.checkDnsChallenge({
    organizationId: 'org-1',
    targetId: 'target-1',
    userId: 'user-1',
  });

  assert.equal(result.verified, true);
  assert.equal(result.status, 'verified');
});


test('already verified target does not need another DNS lookup', async () => {
  const harness = createHarness({ targetState: 'verified' });
  const result = await harness.service.checkDnsChallenge({
    organizationId: 'org-1',
    targetId: 'target-1',
    userId: 'user-1',
  });

  assert.deepEqual(result, { status: 'verified', verified: true, alreadyVerified: true });
});
