const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createFindingFingerprint,
  hashEvidence,
  stableSerialize,
} = require('../lib/evidenceIntegrity');


test('stable serialization ignores object key insertion order', () => {
  const left = { b: 2, a: { z: 3, y: [2, 1] } };
  const right = { a: { y: [2, 1], z: 3 }, b: 2 };
  assert.equal(stableSerialize(left), stableSerialize(right));
  assert.equal(hashEvidence(left), hashEvidence(right));
});


test('evidence hash is a lowercase sha256 hex digest', () => {
  assert.match(hashEvidence({ present: true }), /^[a-f0-9]{64}$/);
});


test('finding fingerprint is deterministic and scoped to target/detector/finding', () => {
  const input = { targetId: 'target-a', detectorId: 'security.headers', findingId: 'missing-csp' };
  const first = createFindingFingerprint(input);
  const second = createFindingFingerprint(input);
  const otherTarget = createFindingFingerprint({ ...input, targetId: 'target-b' });

  assert.equal(first, second);
  assert.notEqual(first, otherTarget);
  assert.match(first, /^[a-f0-9]{64}$/);
});