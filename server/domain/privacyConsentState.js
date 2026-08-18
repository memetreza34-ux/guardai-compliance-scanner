const { HttpError } = require('../lib/httpError');

const PRIVACY_CONSENT_STATES = Object.freeze([
  'no_banner_observed',
  'banner_observed_reject_not_identified',
  'reject_available_not_attempted',
  'reject_action_failed_or_ambiguous',
  'post_reject_not_captured',
  'post_reject_observed',
]);

function intersectStrings(left, right) {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((value) => rightSet.has(value)).sort();
}

function requirePrivacyEvidence(evidence) {
  if (
    !evidence ||
    evidence.detectorId !== 'privacy.browser-observation' ||
    evidence.evidenceType !== 'privacy-browser-observation' ||
    !evidence.normalizedData ||
    !evidence.normalizedData.initial ||
    !evidence.normalizedData.consent
  ) {
    throw new HttpError(500, 'Privacy consent state requires normalized browser Evidence.', 'PRIVACY_EVIDENCE_INVALID');
  }
  return evidence.normalizedData;
}

function derivePrivacyConsentState(evidence) {
  const data = requirePrivacyEvidence(evidence);
  const consent = data.consent;
  const controls = Array.isArray(consent.controls) ? consent.controls : [];
  const rejectControlDetected = controls.some((control) => control?.kind === 'reject');
  const rejectAttempted = consent.rejectAction?.attempted === true;
  const rejectCompleted = consent.rejectAction?.completed === true;
  const afterRejectCaptured = Boolean(data.afterReject);

  let state;
  if (consent.bannerDetected !== true) {
    state = 'no_banner_observed';
  } else if (!rejectControlDetected) {
    state = 'banner_observed_reject_not_identified';
  } else if (!rejectAttempted) {
    state = 'reject_available_not_attempted';
  } else if (!rejectCompleted) {
    state = 'reject_action_failed_or_ambiguous';
  } else if (!afterRejectCaptured) {
    state = 'post_reject_not_captured';
  } else {
    state = 'post_reject_observed';
  }

  const initialNetwork = data.initial.network || {};
  const afterNetwork = data.afterReject?.network || null;
  const initialCookies = data.initial.cookies || {};
  const afterCookies = data.afterReject?.cookies || null;
  const initialStorage = data.initial.storage || {};
  const afterStorage = data.afterReject?.storage || null;

  const initialOrigins = Array.isArray(initialNetwork.crossOriginOrigins)
    ? initialNetwork.crossOriginOrigins
    : [];
  const afterOrigins = Array.isArray(afterNetwork?.crossOriginOrigins)
    ? afterNetwork.crossOriginOrigins
    : [];

  return {
    state,
    coverage: {
      initialObservationCaptured: true,
      bannerObserved: consent.bannerDetected === true,
      rejectControlDetected,
      rejectAttempted,
      rejectCompleted,
      postRejectObservationCaptured: afterRejectCaptured,
    },
    deltas: {
      initialCrossOriginRequestCount: Number(initialNetwork.crossOriginCount || 0),
      postRejectCrossOriginRequestCount: afterNetwork ? Number(afterNetwork.crossOriginCount || 0) : null,
      crossOriginOriginsObservedInBothPhases: afterNetwork
        ? intersectStrings(initialOrigins, afterOrigins)
        : [],
      initialCookieCount: Number(initialCookies.totalCount || 0),
      postRejectCookieCount: afterCookies ? Number(afterCookies.totalCount || 0) : null,
      cookieCountDelta: afterCookies
        ? Number(afterCookies.totalCount || 0) - Number(initialCookies.totalCount || 0)
        : null,
      initialLocalStorageEntryCount: Number(initialStorage.localStorageEntryCount || 0),
      postRejectLocalStorageEntryCount: afterStorage
        ? Number(afterStorage.localStorageEntryCount || 0)
        : null,
    },
    interpretation: 'technical_observation_only',
    notices: [
      'The consent state describes browser-observation coverage, not legal validity or compliance.',
      'Cross-origin activity observed before or after a reject interaction is not automatically classified as tracking.',
    ],
  };
}

module.exports = {
  derivePrivacyConsentState,
  intersectStrings,
  PRIVACY_CONSENT_STATES,
  requirePrivacyEvidence,
};
