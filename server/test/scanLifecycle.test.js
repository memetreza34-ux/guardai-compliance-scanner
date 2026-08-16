const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertScanStatusTransition,
  canTransitionScanStatus,
  isScanStatus,
} = require('../domain/scanLifecycle');

test('GuardAI scan statuses are explicit', () => {
  for (const status of ['queued', 'running', 'completed', 'failed', 'cancelled']) {
    assert.equal(isScanStatus(status), true);
  }
  assert.equal(isScanStatus('processing'), false);
});

test('queued and running transitions follow the worker lifecycle', () => {
  assert.equal(canTransitionScanStatus('queued', 'running'), true);
  assert.equal(canTransitionScanStatus('queued', 'cancelled'), true);
  assert.equal(canTransitionScanStatus('running', 'completed'), true);
  assert.equal(canTransitionScanStatus('running', 'failed'), true);
});

test('terminal scan states cannot transition again', () => {
  for (const terminal of ['completed', 'failed', 'cancelled']) {
    assert.equal(canTransitionScanStatus(terminal, 'running'), false);
  }
});

test('invalid transition throws conflict', () => {
  assert.throws(
    () => assertScanStatusTransition('completed', 'running'),
    (error) => error.name === 'HttpError' && error.statusCode === 409,
  );
});
