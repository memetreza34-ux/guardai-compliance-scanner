const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPrivacyBrowserEvidence } = require('../scanners/privacyBrowserEvidence');
const { derivePrivacyConsentState } = require('../domain/privacyConsentState');

function observation(overrides = {}) {
  return {
    finalUrl: 'https://example.com/',
    initial: {
      requests: [
        { url: 'https://example.com/app.js', resourceType: 'script' },
        { url: 'https://metrics.example.net/collect?id=one', resourceType: 'fetch' },
      ],
      cookies: [{ domain: '.example.com', secure: true, httpOnly: false, sameSite: 'Lax' }],
      storage: { localStorageEntryCount: 1, sessionStorageEntryCount: 0 },
    },
    consentBannerDetected: true,
    consentControls: [{ kind: 'reject', label: 'Reject all' }],
    rejectAction: { attempted: true, completed: true },
    afterReject: {
      requests: [
        { url: 'https://example.com/app.js', resourceType: 'script' },
        { url: 'https://metrics.example.net/collect?id=two', resourceType: 'fetch' },
      ],
      cookies: [],
      storage: { localStorageEntryCount: 0, sessionStorageEntryCount: 0 },
    },
    ...overrides,
  };
}

test('complete reject observation produces post_reject_observed without legal conclusion', () => {
  const evidence = buildPrivacyBrowserEvidence(observation());
  const state = derivePrivacyConsentState(evidence);
  assert.equal(state.state, 'post_reject_observed');
  assert.equal(state.coverage.rejectCompleted, true);
  assert.deepEqual(
    state.deltas.crossOriginOriginsObservedInBothPhases,
    ['https://metrics.example.net'],
  );
  assert.equal(state.deltas.cookieCountDelta, -1);
  assert.equal(state.interpretation, 'technical_observation_only');
  assert.equal(Object.prototype.hasOwnProperty.call(state, 'compliant'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(state, 'violation'), false);
});

test('missing reliable reject control is a coverage state, not a pass/fail claim', () => {
  const evidence = buildPrivacyBrowserEvidence(observation({
    consentControls: [{ kind: 'manage', label: 'Settings' }],
    rejectAction: { attempted: false, completed: false },
    afterReject: undefined,
  }));
  const state = derivePrivacyConsentState(evidence);
  assert.equal(state.state, 'banner_observed_reject_not_identified');
  assert.equal(state.coverage.rejectControlDetected, false);
  assert.equal(state.deltas.postRejectCrossOriginRequestCount, null);
});

test('no observed consent banner remains an observation state only', () => {
  const evidence = buildPrivacyBrowserEvidence(observation({
    consentBannerDetected: false,
    consentControls: [],
    rejectAction: { attempted: false, completed: false },
    afterReject: undefined,
  }));
  const state = derivePrivacyConsentState(evidence);
  assert.equal(state.state, 'no_banner_observed');
  assert.equal(state.coverage.bannerObserved, false);
});

test('attempted but incomplete reject interaction is surfaced as ambiguous', () => {
  const evidence = buildPrivacyBrowserEvidence(observation({
    rejectAction: { attempted: true, completed: false },
    afterReject: undefined,
  }));
  const state = derivePrivacyConsentState(evidence);
  assert.equal(state.state, 'reject_action_failed_or_ambiguous');
  assert.equal(state.coverage.rejectAttempted, true);
  assert.equal(state.coverage.rejectCompleted, false);
});
