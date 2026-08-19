const { HttpError } = require('../lib/httpError');
const {
  assertBrowserRuntimeProvider,
  createBrowserTask,
  DEFAULT_BROWSER_BUDGET,
  normalizeBrowserBudget,
} = require('../browser/browserRuntimeContract');
const { derivePrivacyConsentState } = require('../domain/privacyConsentState');
const { buildAccessibilityEvidence } = require('../scanners/accessibilityEvidence');
const { buildPrivacyBrowserEvidence } = require('../scanners/privacyBrowserEvidence');

const BROWSER_OBSERVATION_JOB_TYPES = Object.freeze(['privacy', 'accessibility']);
const MIN_LEASE_HEADROOM_MS = 10000;

function normalizeBrowserJobTypes(jobTypes = BROWSER_OBSERVATION_JOB_TYPES) {
  if (!Array.isArray(jobTypes) || jobTypes.length === 0) {
    throw new TypeError('Browser observation worker requires at least one job type.');
  }
  const unique = [...new Set(jobTypes)];
  const invalid = unique.filter((jobType) => !BROWSER_OBSERVATION_JOB_TYPES.includes(jobType));
  if (invalid.length > 0) {
    throw new TypeError(`Unsupported Browser observation job type: ${invalid.join(', ')}`);
  }
  return unique;
}

function assertBrowserLeaseBudget(leaseSeconds, budget = DEFAULT_BROWSER_BUDGET) {
  const normalizedBudget = normalizeBrowserBudget(budget);
  if (!Number.isInteger(leaseSeconds) || leaseSeconds <= 0) {
    throw new TypeError('Browser observation lease must be a positive integer.');
  }
  if ((leaseSeconds * 1000) < normalizedBudget.taskTimeoutMs + MIN_LEASE_HEADROOM_MS) {
    throw new TypeError('Browser observation lease must exceed the task timeout with GuardAI safety headroom.');
  }
  return normalizedBudget;
}

function attachRuntimeProvenance(evidence, attestation, additionalNormalizedData = {}) {
  return {
    ...evidence,
    state: 'observed',
    score: null,
    issues: [],
    normalizedData: {
      ...evidence.normalizedData,
      ...additionalNormalizedData,
      runtime: {
        runtimeId: attestation.runtimeId,
        runtimeVersion: attestation.runtimeVersion,
      },
    },
  };
}

async function executeBrowserObservationJob(
  context,
  {
    browserProvider,
    budget = DEFAULT_BROWSER_BUDGET,
  },
) {
  if (!context || typeof context !== 'object') {
    throw new TypeError('Browser observation worker requires a Job execution context.');
  }
  if (!BROWSER_OBSERVATION_JOB_TYPES.includes(context.jobType)) {
    throw new HttpError(500, 'Browser observation worker received the wrong job type.', 'WORKER_JOB_TYPE_MISMATCH');
  }
  if (context.targetType !== 'website') {
    throw new HttpError(500, 'Browser observation worker requires a Website Target.', 'WORKER_TARGET_TYPE_MISMATCH');
  }
  if (typeof context.targetUrl !== 'string' || context.targetUrl.length === 0) {
    throw new HttpError(422, 'Verified Website Target has no canonical URL.', 'TARGET_URL_MISSING');
  }

  const attestation = assertBrowserRuntimeProvider(browserProvider);
  const task = createBrowserTask({
    taskType: context.jobType,
    targetUrl: context.targetUrl,
    budget,
  });
  const observation = await browserProvider.runTask(task);

  if (context.jobType === 'privacy') {
    const evidence = buildPrivacyBrowserEvidence(observation);
    const consentState = derivePrivacyConsentState(evidence);
    return attachRuntimeProvenance(evidence, attestation, { consentState });
  }

  const evidence = buildAccessibilityEvidence(observation);
  return attachRuntimeProvenance(evidence, attestation);
}

async function processOneBrowserObservationJob({
  jobRepository,
  jobFailureService,
  browserProvider,
  workerId,
  jobTypes = BROWSER_OBSERVATION_JOB_TYPES,
  leaseSeconds = 60,
  budget = DEFAULT_BROWSER_BUDGET,
}) {
  if (!jobRepository || typeof jobRepository.claimNextJob !== 'function') {
    throw new TypeError('Browser observation worker requires a Job repository.');
  }
  if (!jobFailureService || typeof jobFailureService.fail !== 'function') {
    throw new TypeError('Browser observation worker requires a Job failure service.');
  }

  // Fail before claiming work. A deployment/runtime safety problem must never consume
  // customer jobs or mutate their Scan lifecycle.
  assertBrowserRuntimeProvider(browserProvider);
  const normalizedJobTypes = normalizeBrowserJobTypes(jobTypes);
  const normalizedBudget = assertBrowserLeaseBudget(leaseSeconds, budget);

  const job = await jobRepository.claimNextJob({
    workerId,
    jobTypes: normalizedJobTypes,
    leaseSeconds,
  });
  if (!job) return { state: 'idle' };

  try {
    const context = await jobRepository.getExecutionContext({ jobId: job.id, workerId });
    const assessment = await executeBrowserObservationJob(context, {
      browserProvider,
      budget: normalizedBudget,
    });
    const completion = await jobRepository.completeJob({
      jobId: job.id,
      workerId,
      assessment,
    });
    return {
      state: 'completed',
      jobId: job.id,
      scanId: job.scanId,
      completion,
    };
  } catch (error) {
    const failure = await jobFailureService.fail({ jobId: job.id, workerId, error });
    return {
      state: failure.retryScheduled ? 'retrying' : 'failed',
      jobId: job.id,
      scanId: job.scanId,
      failure,
    };
  }
}

module.exports = {
  assertBrowserLeaseBudget,
  attachRuntimeProvenance,
  BROWSER_OBSERVATION_JOB_TYPES,
  executeBrowserObservationJob,
  MIN_LEASE_HEADROOM_MS,
  normalizeBrowserJobTypes,
  processOneBrowserObservationJob,
};
