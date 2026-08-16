const { HttpError } = require('../lib/httpError');

const SCAN_STATUSES = Object.freeze(['queued', 'running', 'completed', 'failed', 'cancelled']);

const ALLOWED_SCAN_TRANSITIONS = Object.freeze({
  queued: Object.freeze(['running', 'cancelled', 'failed']),
  running: Object.freeze(['completed', 'failed', 'cancelled']),
  completed: Object.freeze([]),
  failed: Object.freeze([]),
  cancelled: Object.freeze([]),
});

function isScanStatus(value) {
  return typeof value === 'string' && SCAN_STATUSES.includes(value);
}

function canTransitionScanStatus(from, to) {
  if (!isScanStatus(from) || !isScanStatus(to)) return false;
  return ALLOWED_SCAN_TRANSITIONS[from].includes(to);
}

function assertScanStatusTransition(from, to) {
  if (!canTransitionScanStatus(from, to)) {
    throw new HttpError(409, `Scan status transition ${from} -> ${to} is not allowed.`);
  }
}

module.exports = {
  ALLOWED_SCAN_TRANSITIONS,
  assertScanStatusTransition,
  canTransitionScanStatus,
  isScanStatus,
  SCAN_STATUSES,
};
