const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateNextMonitorRun,
  monitorScanIdempotencyKey,
  normalizeMonitorInterval,
  normalizeMonitorModule,
} = require('../domain/monitoring');


test('monitoring interval is bounded to one hour through seven days', () => {
  assert.equal(normalizeMonitorInterval(60), 60);
  assert.equal(normalizeMonitorInterval(10080), 10080);
  assert.throws(
    () => normalizeMonitorInterval(59),
    (error) => error.code === 'INVALID_MONITOR_INTERVAL',
  );
  assert.throws(
    () => normalizeMonitorInterval(10081),
    (error) => error.code === 'INVALID_MONITOR_INTERVAL',
  );
});


test('only real Security monitoring can currently be requested', () => {
  assert.equal(normalizeMonitorModule(undefined), 'security');
  assert.equal(normalizeMonitorModule('security'), 'security');
  assert.throws(
    () => normalizeMonitorModule('privacy'),
    (error) => error.code === 'MONITOR_MODULE_NOT_AVAILABLE',
  );
});


test('next run skips missed intervals instead of causing catch-up storm', () => {
  const scheduledFor = '2026-08-16T10:00:00.000Z';
  const nowMs = Date.parse('2026-08-16T14:17:00.000Z');
  assert.equal(
    calculateNextMonitorRun(scheduledFor, 60, nowMs),
    '2026-08-16T15:00:00.000Z',
  );
});


test('monitor scan idempotency key is deterministic for one scheduled slot', () => {
  const first = monitorScanIdempotencyKey(
    '11111111-1111-4111-8111-111111111111',
    '2026-08-16T18:00:00.000Z',
  );
  const second = monitorScanIdempotencyKey(
    '11111111-1111-4111-8111-111111111111',
    '2026-08-16T18:00:00.000Z',
  );
  assert.equal(first, second);
  assert.match(first, /^monitor:11111111-1111-4111-8111-111111111111:/);
});
