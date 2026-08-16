const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeEvidenceFilterText,
  normalizeEvidenceLimit,
} = require('../repositories/evidenceRepository');


test('evidence limit defaults and remains bounded', () => {
  assert.equal(normalizeEvidenceLimit(undefined), 50);
  assert.equal(normalizeEvidenceLimit('1'), 1);
  assert.equal(normalizeEvidenceLimit('100'), 100);
  assert.throws(
    () => normalizeEvidenceLimit('101'),
    (error) => error.code === 'INVALID_EVIDENCE_LIMIT',
  );
});


test('evidence text filters are normalized and bounded', () => {
  assert.equal(normalizeEvidenceFilterText(' security.headers ', 'detectorId', 120), 'security.headers');
  assert.equal(normalizeEvidenceFilterText('', 'type', 120), null);
  assert.throws(
    () => normalizeEvidenceFilterText('x'.repeat(121), 'type', 120),
    (error) => error.code === 'INVALID_EVIDENCE_FILTER',
  );
});