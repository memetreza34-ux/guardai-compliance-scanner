const { HttpError } = require('../lib/httpError');

const FINDING_STATUSES = Object.freeze(['open', 'resolved', 'accepted_risk']);

function normalizeFindingStatus(value) {
  if (typeof value !== 'string' || !FINDING_STATUSES.includes(value)) {
    throw new HttpError(400, 'Finding status is invalid.', 'INVALID_FINDING_STATUS');
  }
  return value;
}

function normalizeFindingStatusReason(value, { required = false } = {}) {
  if (value === null || value === undefined || value === '') {
    if (required) {
      throw new HttpError(
        400,
        'A reason is required when accepting risk.',
        'FINDING_STATUS_REASON_REQUIRED',
      );
    }
    return null;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, 'Finding status reason is invalid.', 'INVALID_FINDING_STATUS_REASON');
  }

  const reason = value.trim().replace(/\s+/g, ' ');
  if (reason.length < (required ? 10 : 1) || reason.length > 2000) {
    throw new HttpError(
      400,
      required
        ? 'Accepted-risk reason must contain 10 to 2000 characters.'
        : 'Finding status reason must contain 1 to 2000 characters.',
      'INVALID_FINDING_STATUS_REASON',
    );
  }

  return reason;
}

function minimumRoleForFindingTransition(currentStatus, nextStatus) {
  normalizeFindingStatus(currentStatus);
  normalizeFindingStatus(nextStatus);

  if (currentStatus === nextStatus) return 'viewer';
  if (currentStatus === 'accepted_risk' || nextStatus === 'accepted_risk') return 'admin';
  return 'member';
}

function normalizeFindingTransition({ currentStatus, nextStatus, reason }) {
  const current = normalizeFindingStatus(currentStatus);
  const next = normalizeFindingStatus(nextStatus);
  const normalizedReason = normalizeFindingStatusReason(reason, {
    required: next === 'accepted_risk' && current !== 'accepted_risk',
  });

  return {
    currentStatus: current,
    nextStatus: next,
    reason: normalizedReason,
    minimumRole: minimumRoleForFindingTransition(current, next),
    changed: current !== next,
  };
}

function statusAfterRediscovery(currentStatus) {
  const current = normalizeFindingStatus(currentStatus);
  return current === 'resolved' ? 'open' : current;
}

module.exports = {
  FINDING_STATUSES,
  minimumRoleForFindingTransition,
  normalizeFindingStatus,
  normalizeFindingStatusReason,
  normalizeFindingTransition,
  statusAfterRediscovery,
};