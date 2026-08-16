const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAuditLimit } = require('../repositories/auditRepository');


test('audit pagination limit defaults to 50 and stays bounded', () => {
  assert.equal(normalizeAuditLimit(undefined), 50);
  assert.equal(normalizeAuditLimit('1'), 1);
  assert.equal(normalizeAuditLimit('100'), 100);
});


test('audit pagination rejects invalid limits with stable code', () => {
  for (const value of ['0', '101', '1.5', 'abc']) {
    assert.throws(
      () => normalizeAuditLimit(value),
      (error) => error.code === 'INVALID_AUDIT_LIMIT' && error.statusCode === 400,
    );
  }
});