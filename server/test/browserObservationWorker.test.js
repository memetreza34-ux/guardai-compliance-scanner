const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertBrowserLeaseBudget,
  executeBrowserObservationJob,
  processOneBrowserObservationJob,
} = require('../workers/browserObservationWorker');

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

function privacyObservation() {
  return {
    finalUrl: 'https://example.com/privacy?secret=must-not-persist#fragment',
    initial: {
      requests: [
        { url: 'https://example.com/app.js', resourceType: 'script' },
        { url: 'https://cdn.example.net/collect?token=must-not-persist', resourceType: 'fetch' },
      ],
      cookies: [
        {
          name: 'session',
          value: 'must-not-persist',
          domain: '.example.com',
          secure: true,
          httpOnly: true,
          sameSite: 'Lax',
        },
      ],
      storage: { localStorageEntryCount: 2, sessionStorageEntryCount: 1 },
    },
    consentBannerDetected: true,
    consentControls: [{ kind: 'reject', label: 'Reject with private text' }],
    rejectAction: { attempted: true, completed: true },
    afterReject: {
      requests: [{ url: 'https://example.com/app.js', resourceType: 'script' }],
      cookies: [],
      storage: { localStorageEntryCount: 1, sessionStorageEntryCount: 0 },
    },
    privacyLinks: [{ href: 'https://example.com/privacy-policy?user=private' }],
  };
}

function accessibilityObservation() {
  return {
    engineId: 'axe-core',
    engineVersion: '4.10.2',
    finalUrl: 'https://example.com/account?secret=must-not-persist',
    violations: [
      {
        id: 'image-alt',
        impact: 'critical',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/image-alt?secret=must-not-persist',
        tags: ['wcag2a', 'wcag111'],
        nodes: [
          {
            html: '<img src="private-user-image.jpg">',
            target: ['#private-customer-element'],
            failureSummary: 'private customer content',
          },
        ],
      },
    ],
    incomplete: [],
    passes: [],
    inapplicable: [],
  };
}

function safeProvider() {
  return {
    getSafetyAttestation() {
      return safeAttestation();
    },
    async runTask(task) {
      return task.taskType === 'privacy' ? privacyObservation() : accessibilityObservation();
    },
  };
}

test('privacy browser job produces observed unscored Evidence with consent coverage', async () => {
  const result = await executeBrowserObservationJob({
    jobType: 'privacy',
    targetType: 'website',
    targetUrl: 'https://example.com/',
  }, { browserProvider: safeProvider() });

  assert.equal(result.state, 'observed');
  assert.equal(result.score, null);
  assert.deepEqual(result.issues, []);
  assert.equal(result.detectorId, 'privacy.browser-observation');
  assert.equal(result.normalizedData.runtime.runtimeId, 'guardai-browser-sandbox');
  assert.equal(result.normalizedData.consentState.state, 'post_reject_observed');
  assert.equal(result.normalizedData.consentState.interpretation, 'technical_observation_only');

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('must-not-persist'), false);
  assert.equal(serialized.includes('private text'), false);
});

test('accessibility browser job persists aggregate engine evidence without DOM or selectors', async () => {
  const result = await executeBrowserObservationJob({
    jobType: 'accessibility',
    targetType: 'website',
    targetUrl: 'https://example.com/',
  }, { browserProvider: safeProvider() });

  assert.equal(result.state, 'observed');
  assert.equal(result.score, null);
  assert.deepEqual(result.issues, []);
  assert.equal(result.detectorId, 'accessibility.automated-observation');
  assert.equal(result.normalizedData.summary.violationRuleCount, 1);
  assert.equal(result.normalizedData.summary.violationNodeCount, 1);
  assert.equal(result.normalizedData.runtime.runtimeVersion, '0.1.0');

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('private-user-image.jpg'), false);
  assert.equal(serialized.includes('#private-customer-element'), false);
  assert.equal(serialized.includes('private customer content'), false);
  assert.equal(serialized.includes('must-not-persist'), false);
});

test('unsafe Browser Runtime fails before claiming a customer Job', async () => {
  let claimCalls = 0;
  const jobRepository = {
    async claimNextJob() {
      claimCalls += 1;
      return null;
    },
  };
  const browserProvider = {
    getSafetyAttestation() {
      return safeAttestation({ privateNetworkDenied: false });
    },
    async runTask() {
      throw new Error('must never run');
    },
  };

  await assert.rejects(
    () => processOneBrowserObservationJob({
      jobRepository,
      jobFailureService: { async fail() {} },
      browserProvider,
      workerId: 'browser:test',
      jobTypes: ['privacy'],
      leaseSeconds: 60,
    }),
    (error) => error.code === 'BROWSER_RUNTIME_NOT_SAFE',
  );
  assert.equal(claimCalls, 0);
});

test('Browser Worker lease must exceed Browser task timeout with safety headroom', () => {
  assert.throws(
    () => assertBrowserLeaseBudget(39),
    /safety headroom/i,
  );
  assert.doesNotThrow(() => assertBrowserLeaseBudget(40));
});
