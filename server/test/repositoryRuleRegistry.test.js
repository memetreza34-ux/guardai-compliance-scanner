const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertRepositoryRuleRegistry,
  getRepositoryRuleForFinding,
  registry,
} = require('../scanners/repositoryRuleRegistry');

test('repository rule registry is internally consistent, versioned and hashed', () => {
  assert.equal(assertRepositoryRuleRegistry(), true);
  assert.equal(registry.detectorId, 'repository.baseline');
  assert.equal(registry.detectorVersion, '1.0.0');
  assert.equal(registry.rulesetVersion, 1);
  assert.match(registry.manifestHash, /^[a-f0-9]{64}$/);
});

test('repository finding IDs resolve to immutable rule provenance', () => {
  const rule = getRepositoryRuleForFinding('github-token-indicator');
  assert.equal(rule.id, 'repository.secret.github_token');
  assert.equal(rule.version, 1);
  assert.equal(rule.defaultSeverity, 'critical');
  assert.match(rule.definitionHash, /^[a-f0-9]{64}$/);
  assert.ok(rule.evidenceRequirements.length > 0);
  assert.ok(rule.remediation.length > 0);
  assert.ok(rule.changelog.length > 0);
});

test('unknown repository finding mapping fails closed', () => {
  assert.throws(
    () => getRepositoryRuleForFinding('unknown-indicator'),
    /Unknown GuardAI finding mapping/,
  );
});
