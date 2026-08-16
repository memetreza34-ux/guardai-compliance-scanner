const test = require('node:test');
const assert = require('node:assert/strict');
const { createMonitorSchedulerService } = require('../services/monitorSchedulerService');

function createHarness({ scanCreated = true } = {}) {
  const calls = [];
  const monitor = {
    id: '11111111-1111-4111-8111-111111111111',
    organizationId: '22222222-2222-4222-8222-222222222222',
    targetId: '33333333-3333-4333-8333-333333333333',
    moduleId: 'security',
    status: 'active',
    scheduleMinutes: 60,
    nextRunAt: '2026-08-16T18:00:00.000Z',
    createdBy: '44444444-4444-4444-8444-444444444444',
  };
  const monitorRepository = {
    async claimDueMonitor(input) {
      calls.push(['claim', input]);
      return {
        paused: false,
        scheduledFor: '2026-08-16T18:00:00.000Z',
        monitor,
      };
    },
    async completeScheduledRun(input) {
      calls.push(['complete', input]);
      return { nextRunAt: '2026-08-16T19:00:00.000Z' };
    },
    async releaseLease(input) {
      calls.push(['release', input]);
    },
    async setStatus(input) {
      calls.push(['status', input]);
    },
  };
  const scanRepository = {
    async createQueuedScanWithJobs(input) {
      calls.push(['scan', input]);
      return {
        created: scanCreated,
        scan: { id: '55555555-5555-4555-8555-555555555555', status: 'queued' },
        jobs: [],
      };
    },
  };
  const service = createMonitorSchedulerService({
    monitorRepository,
    scanRepository,
    scannerVersion: '0.1.0',
    contractVersion: '0.2.0',
  });
  return { calls, monitorRepository, scanRepository, service };
}

test('scheduler creates one idempotent persistent Security scan for claimed slot', async () => {
  const { calls, service } = createHarness();
  const result = await service.scheduleOne({ workerId: 'monitor:test:1', leaseSeconds: 60 });
  assert.equal(result.state, 'scheduled');
  assert.equal(result.scanCreated, true);
  const scan = calls.find((entry) => entry[0] === 'scan')[1];
  assert.deepEqual(scan.requestedModules, ['security']);
  assert.equal(scan.requestedBy, '44444444-4444-4444-8444-444444444444');
  assert.match(scan.idempotencyKey, /^monitor:11111111-1111-4111-8111-111111111111:/);
  assert.ok(calls.some((entry) => entry[0] === 'complete'));
});

test('retrying same scheduled slot can reuse existing Scan without creating logical duplicate', async () => {
  const { service } = createHarness({ scanCreated: false });
  const result = await service.scheduleOne({ workerId: 'monitor:test:1', leaseSeconds: 60 });
  assert.equal(result.state, 'scheduled');
  assert.equal(result.scanCreated, false);
  assert.equal(result.scanId, '55555555-5555-4555-8555-555555555555');
});

test('scheduler pauses Monitor when target loses verification', async () => {
  const { calls, service, scanRepository } = createHarness();
  scanRepository.createQueuedScanWithJobs = async () => {
    const error = new Error('not verified');
    error.code = 'TARGET_NOT_VERIFIED';
    error.statusCode = 409;
    const { HttpError } = require('../lib/httpError');
    throw new HttpError(409, 'Target not verified.', 'TARGET_NOT_VERIFIED');
  };
  const result = await service.scheduleOne({ workerId: 'monitor:test:1', leaseSeconds: 60 });
  assert.equal(result.state, 'paused');
  assert.ok(calls.some((entry) => entry[0] === 'status' && entry[1].status === 'paused'));
});
