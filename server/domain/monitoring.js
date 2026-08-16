const { HttpError } = require('../lib/httpError');

const MIN_MONITOR_INTERVAL_MINUTES = 60;
const MAX_MONITOR_INTERVAL_MINUTES = 10080;
const MONITOR_MODULE = 'security';

function normalizeMonitorInterval(value) {
  const interval = Number(value);
  if (
    !Number.isInteger(interval) ||
    interval < MIN_MONITOR_INTERVAL_MINUTES ||
    interval > MAX_MONITOR_INTERVAL_MINUTES
  ) {
    throw new HttpError(
      400,
      `Monitoring interval must be between ${MIN_MONITOR_INTERVAL_MINUTES} and ${MAX_MONITOR_INTERVAL_MINUTES} minutes.`,
      'INVALID_MONITOR_INTERVAL',
    );
  }
  return interval;
}

function normalizeMonitorModule(value) {
  const moduleId = value || MONITOR_MODULE;
  if (moduleId !== MONITOR_MODULE) {
    throw new HttpError(
      422,
      'Only the real Security monitor is available right now.',
      'MONITOR_MODULE_NOT_AVAILABLE',
    );
  }
  return moduleId;
}

function calculateNextMonitorRun(scheduledFor, scheduleMinutes, nowMs = Date.now()) {
  const interval = normalizeMonitorInterval(scheduleMinutes) * 60 * 1000;
  const scheduledMs = new Date(scheduledFor).getTime();
  if (!Number.isFinite(scheduledMs)) {
    throw new TypeError('scheduledFor must be a valid timestamp.');
  }
  const now = Number(nowMs);
  if (!Number.isFinite(now)) {
    throw new TypeError('nowMs must be finite.');
  }

  let next = scheduledMs + interval;
  if (next <= now) {
    const missedIntervals = Math.floor((now - next) / interval) + 1;
    next += missedIntervals * interval;
  }
  return new Date(next).toISOString();
}

function monitorScanIdempotencyKey(monitorId, scheduledFor) {
  if (typeof monitorId !== 'string' || monitorId.length === 0) {
    throw new TypeError('monitorId is required.');
  }
  const scheduled = new Date(scheduledFor);
  if (Number.isNaN(scheduled.getTime())) {
    throw new TypeError('scheduledFor must be a valid timestamp.');
  }
  return `monitor:${monitorId}:${scheduled.toISOString()}`;
}

module.exports = {
  calculateNextMonitorRun,
  MAX_MONITOR_INTERVAL_MINUTES,
  MIN_MONITOR_INTERVAL_MINUTES,
  MONITOR_MODULE,
  monitorScanIdempotencyKey,
  normalizeMonitorInterval,
  normalizeMonitorModule,
};
