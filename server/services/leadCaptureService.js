const { config } = require('../config');
const {
  calculateRetentionExpiry,
  leadSubmissionFingerprint,
  normalizeLeadIdempotencyKey,
  normalizeLeadSubmission,
} = require('../domain/leadCapture');
const { HttpError } = require('../lib/httpError');

function resolveLeadCapturePolicy(runtimeConfig = config) {
  const retentionDays = runtimeConfig.leadRetentionDays;
  const configured =
    runtimeConfig.leadCaptureEnabled === true &&
    typeof runtimeConfig.leadPrivacyNoticeVersion === 'string' &&
    runtimeConfig.leadPrivacyNoticeVersion.trim().length > 0 &&
    Number.isInteger(retentionDays) &&
    retentionDays >= 1 &&
    retentionDays <= 3650;

  return {
    enabled: configured,
    privacyNoticeVersion: configured ? runtimeConfig.leadPrivacyNoticeVersion : null,
    privacyNoticeUrl: configured
      ? new URL('/privacy', runtimeConfig.publicAppUrl).toString()
      : null,
    marketingOptInAvailable: false,
  };
}

function createLeadCaptureService({ leadRepository, runtimeConfig = config }) {
  if (!leadRepository || typeof leadRepository.createLead !== 'function') {
    throw new TypeError('Lead Capture service requires Lead repository.');
  }

  function getPublicConfig() {
    return resolveLeadCapturePolicy(runtimeConfig);
  }

  async function submit({ idempotencyKey, input }) {
    const policy = resolveLeadCapturePolicy(runtimeConfig);
    if (!policy.enabled) {
      throw new HttpError(503, 'GuardAI public contact capture is not configured.', 'LEAD_CAPTURE_NOT_CONFIGURED');
    }

    // Honeypot input is accepted without persistence so automation cannot use the response
    // to learn whether it triggered the spam boundary.
    if (typeof input?.website === 'string' && input.website.trim().length > 0) {
      return { accepted: true, idempotentReplay: false, marketingConfirmationRequired: false };
    }

    const requestKey = normalizeLeadIdempotencyKey(idempotencyKey);
    const normalized = normalizeLeadSubmission(input);
    if (normalized.marketingOptIn) {
      throw new HttpError(
        422,
        'Marketing opt-in is not available until GuardAI Double-Opt-In delivery is enabled.',
        'MARKETING_OPT_IN_NOT_AVAILABLE',
      );
    }

    const submissionFingerprint = leadSubmissionFingerprint(normalized);
    const result = await leadRepository.createLead({
      ...normalized,
      idempotencyKey: requestKey,
      submissionFingerprint,
      privacyNoticeVersion: policy.privacyNoticeVersion,
      retentionExpiresAt: calculateRetentionExpiry(runtimeConfig.leadRetentionDays),
    });

    return {
      accepted: true,
      idempotentReplay: !result.created,
      marketingConfirmationRequired: false,
    };
  }

  return {
    getPublicConfig,
    submit,
  };
}

module.exports = {
  createLeadCaptureService,
  resolveLeadCapturePolicy,
};
