const { HttpError } = require('../lib/httpError');

const BROWSER_TASK_TYPES = Object.freeze(['privacy', 'accessibility']);
const DEFAULT_BROWSER_BUDGET = Object.freeze({
  navigationTimeoutMs: 15000,
  taskTimeoutMs: 30000,
  maxRedirects: 5,
  maxNetworkRequests: 5000,
  maxTransferBytes: 20 * 1024 * 1024,
  maxPopupCount: 0,
  downloadsAllowed: false,
});

function assertBrowserTaskType(taskType) {
  if (!BROWSER_TASK_TYPES.includes(taskType)) {
    throw new HttpError(500, 'Browser worker task type is unsupported.', 'BROWSER_TASK_TYPE_UNSUPPORTED');
  }
  return taskType;
}

function normalizeBrowserBudget(input = DEFAULT_BROWSER_BUDGET) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Browser budget must be an object.');
  }

  const budget = {
    navigationTimeoutMs: Number(input.navigationTimeoutMs),
    taskTimeoutMs: Number(input.taskTimeoutMs),
    maxRedirects: Number(input.maxRedirects),
    maxNetworkRequests: Number(input.maxNetworkRequests),
    maxTransferBytes: Number(input.maxTransferBytes),
    maxPopupCount: Number(input.maxPopupCount),
    downloadsAllowed: input.downloadsAllowed === true,
  };

  if (!Number.isInteger(budget.navigationTimeoutMs) || budget.navigationTimeoutMs < 1000 || budget.navigationTimeoutMs > 60000) {
    throw new TypeError('Browser navigation timeout is outside GuardAI bounds.');
  }
  if (!Number.isInteger(budget.taskTimeoutMs) || budget.taskTimeoutMs < budget.navigationTimeoutMs || budget.taskTimeoutMs > 120000) {
    throw new TypeError('Browser task timeout is outside GuardAI bounds.');
  }
  if (!Number.isInteger(budget.maxRedirects) || budget.maxRedirects < 0 || budget.maxRedirects > 10) {
    throw new TypeError('Browser redirect budget is outside GuardAI bounds.');
  }
  if (!Number.isInteger(budget.maxNetworkRequests) || budget.maxNetworkRequests < 1 || budget.maxNetworkRequests > 10000) {
    throw new TypeError('Browser network-request budget is outside GuardAI bounds.');
  }
  if (!Number.isInteger(budget.maxTransferBytes) || budget.maxTransferBytes < 1024 * 1024 || budget.maxTransferBytes > 100 * 1024 * 1024) {
    throw new TypeError('Browser transfer budget is outside GuardAI bounds.');
  }
  if (!Number.isInteger(budget.maxPopupCount) || budget.maxPopupCount < 0 || budget.maxPopupCount > 5) {
    throw new TypeError('Browser popup budget is outside GuardAI bounds.');
  }
  if (budget.downloadsAllowed) {
    throw new TypeError('GuardAI browser MVP does not permit downloads.');
  }

  return Object.freeze(budget);
}

function assertBrowserRuntimeAttestation(attestation) {
  if (!attestation || typeof attestation !== 'object' || Array.isArray(attestation)) {
    throw new HttpError(503, 'GuardAI browser runtime safety attestation is missing.', 'BROWSER_RUNTIME_NOT_SAFE');
  }

  const requiredTrue = [
    'isolatedWorker',
    'connectionTimeEgressEnforced',
    'privateNetworkDenied',
    'metadataNetworkDenied',
    'ephemeralProfile',
    'downloadsDisabled',
    'noInboundListener',
    'resourceLimitsEnforced',
  ];
  const missing = requiredTrue.filter((key) => attestation[key] !== true);

  if (missing.length > 0) {
    throw new HttpError(
      503,
      'GuardAI browser runtime does not satisfy required isolation controls.',
      'BROWSER_RUNTIME_NOT_SAFE',
      { missingControls: missing },
    );
  }

  if (
    typeof attestation.runtimeId !== 'string' ||
    !/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(attestation.runtimeId) ||
    typeof attestation.runtimeVersion !== 'string' ||
    attestation.runtimeVersion.length < 1 ||
    attestation.runtimeVersion.length > 80
  ) {
    throw new HttpError(503, 'GuardAI browser runtime provenance is invalid.', 'BROWSER_RUNTIME_NOT_SAFE');
  }

  return Object.freeze({
    runtimeId: attestation.runtimeId,
    runtimeVersion: attestation.runtimeVersion,
    ...Object.fromEntries(requiredTrue.map((key) => [key, true])),
  });
}

function assertBrowserRuntimeProvider(provider) {
  if (
    !provider ||
    typeof provider.getSafetyAttestation !== 'function' ||
    typeof provider.runTask !== 'function'
  ) {
    throw new HttpError(503, 'GuardAI browser runtime provider is not configured.', 'BROWSER_RUNTIME_NOT_CONFIGURED');
  }
  return assertBrowserRuntimeAttestation(provider.getSafetyAttestation());
}

function createBrowserTask({ taskType, targetUrl, budget = DEFAULT_BROWSER_BUDGET }) {
  assertBrowserTaskType(taskType);
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new HttpError(500, 'Browser worker target URL is invalid.', 'BROWSER_TARGET_INVALID');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new HttpError(500, 'Browser worker target URL violates GuardAI policy.', 'BROWSER_TARGET_INVALID');
  }

  return Object.freeze({
    taskType,
    targetUrl: parsed.toString(),
    budget: normalizeBrowserBudget(budget),
  });
}

module.exports = {
  assertBrowserRuntimeAttestation,
  assertBrowserRuntimeProvider,
  assertBrowserTaskType,
  BROWSER_TASK_TYPES,
  createBrowserTask,
  DEFAULT_BROWSER_BUDGET,
  normalizeBrowserBudget,
};
