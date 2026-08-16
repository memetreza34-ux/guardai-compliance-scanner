const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRuleLimit } = require('../repositories/ruleRepository');


test('Rule Catalog limit defaults and stays bounded', () => {
  assert.equal(normalizeRuleLimit(undefined), 50);
  assert.equal(normalizeRuleLimit('1'), 1);
  assert.equal(normalizeRuleLimit('100'), 100);
  assert.throws(
    () => normalizeRuleLimit('101'),
    (error) => error.code === 'INVALID_RULE_LIMIT' && error.statusCode === 400,
  );
});