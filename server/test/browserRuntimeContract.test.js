const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertBrowserRuntimeProvider,
  createBrowserTask,
  DEFAULT_BROWSER_BUDGET,
  normalizeBrowserBudget,
} = require('../browser/browserRuntimeContract');

function safeAttestation(overrides = {}) {
  return {
    runtimeId: 'guardai-browser-sandbox',
    runtimeVersion: '0.1.0',
    isolatedWorker: true,
    connectionTimeEgressEnforced: true,
    privateNetworkDenied: true,
    metadataNetworkDenied: true,
    ephemeralProfile: true,
    downloadsDisabled: true,
    noInboundListener: true,
    resourceLimitsEnforced: true,
    ...overrides,
  };
}

test('safe browser provider requires all isolation attestations', () => {
  const provider = {
    getSafetyAttestation() {
      return safeAttestation();
    },
    async runTask() {},
  };

  const attestation = assertBrowserRuntimeProvider(provider);
  assert.equal(attestation.runtimeId, 'guardai-browser-sandbox');
  assert.equal(attestation.privateNetworkDenied, true);
});

test('browser provider fails closed when connection-time egress is not enforced', () => {
  const provider = {
    getSafetyAttestation() {
      return safeAttestation({ connectionTimeEgressEnforced: false });
    },
    async runTask() {},
  };

  assert.throws(
    () => assertBrowserRuntimeProvider(provider),
    (error) =>
      error.code === 'BROWSER_RUNTIME_NOT_SAFE' &&
      error.statusCode === 503 &&
      error.details?.missingControls?.includes('connectionTimeEgressEnforced'),
  );
});

test('browser provider fails closed when private network or download controls are missing', () => {
  for (const missingControl of ['privateNetworkDenied', 'metadataNetworkDenied', 'downloadsDisabled', 'ephemeralProfile']) {
    const provider = {
      getSafetyAttestation() {
        return safeAttestation({ [missingControl]: false });
      },
      async runTask() {},
    };

    assert.throws(
      () => assertBrowserRuntimeProvider(provider),
      (error) =>
        error.code === 'BROWSER_RUNTIME_NOT_SAFE' &&
        error.details?.missingControls?.includes(missingControl),
    );
  }
});

test('browser task keeps bounded defaults and refuses credentialed target URLs', () => {
  const task = createBrowserTask({ taskType: 'privacy', targetUrl: 'https://example.com/path?token=secret' });
  assert.equal(task.taskType, 'privacy');
  assert.equal(task.targetUrl, 'https://example.com/path?token=secret');
  assert.deepEqual(task.budget, DEFAULT_BROWSER_BUDGET);

  assert.throws(
    () => createBrowserTask({ taskType: 'accessibility', targetUrl: 'https://user:pass@example.com/' }),
    (error) => error.code === 'BROWSER_TARGET_INVALID',
  );
});

test('browser budgets reject downloads and unbounded resource settings', () => {
  assert.throws(
    () => normalizeBrowserBudget({ ...DEFAULT_BROWSER_BUDGET, downloadsAllowed: true }),
    /does not permit downloads/i,
  );
  assert.throws(
    () => normalizeBrowserBudget({ ...DEFAULT_BROWSER_BUDGET, maxNetworkRequests: 10001 }),
    /network-request budget/i,
  );
  assert.throws(
    () => normalizeBrowserBudget({ ...DEFAULT_BROWSER_BUDGET, maxTransferBytes: 101 * 1024 * 1024 }),
    /transfer budget/i,
  );
});
