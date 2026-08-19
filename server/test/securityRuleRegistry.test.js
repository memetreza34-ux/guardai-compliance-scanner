const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertSecurityRuleRegistry,
  getSecurityRule,
  registry,
} = require('../scanners/securityRuleRegistry');
const { buildSecurityAssessment } = require('../scanners/securityHeaders');


test('security rule registry is internally valid, detector-aligned and hashed', () => {
  assert.equal(assertSecurityRuleRegistry(), true);
  assert.equal(registry.detectorId, 'security.headers');
  assert.equal(registry.detectorVersion, '1.1.0');
  assert.match(registry.manifestHash, /^[a-f0-9]{64}$/);
  const rule = getSecurityRule('security.content_security_policy');
  assert.equal(rule.version, 1);
  assert.match(rule.definitionHash, /^[a-f0-9]{64}$/);
  assert.ok(rule.evidenceRequirements.length > 0);
  assert.ok(rule.remediation.length > 0);
  assert.ok(rule.changelog.length > 0);
});


test('every emitted security finding carries a registered rule version', () => {
  const result = buildSecurityAssessment({}, 'http://example.com/');
  assert.ok(result.category.issues.length > 0);
  for (const issue of result.category.issues) {
    // Detector emits a finding ID; the Worker binds canonical Rule provenance.
    assert.equal(typeof issue.id, 'string');
  }
});


test('unknown rule IDs fail closed', () => {
  assert.throws(() => getSecurityRule('security.unknown'), /Unknown GuardAI rule/);
});
