const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertSecurityRuleRegistry,
  getSecurityRule,
  registry,
} = require('../scanners/securityRuleRegistry');
const { buildSecurityAssessment } = require('../scanners/securityHeaders');


test('security rule registry is internally valid and detector-aligned', () => {
  assert.equal(assertSecurityRuleRegistry(), true);
  assert.equal(registry.detectorId, 'security.headers');
  assert.equal(registry.detectorVersion, '1.1.0');
  assert.equal(getSecurityRule('security.content_security_policy').version, 1);
});


test('every emitted security finding carries a registered rule version', () => {
  const result = buildSecurityAssessment({}, 'http://example.com/');
  assert.ok(result.category.issues.length > 0);
  for (const issue of result.category.issues) {
    const rule = getSecurityRule(issue.ruleId);
    assert.equal(issue.ruleVersion, rule.version);
  }
});


test('unknown rule IDs fail closed', () => {
  assert.throws(() => getSecurityRule('security.unknown'), /Unknown GuardAI security rule/);
});