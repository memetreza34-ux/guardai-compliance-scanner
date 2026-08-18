const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertRepositoryRuleRegistry,
  getRepositoryRuleForFinding,
  registry,
} = require('../scanners/repositoryRuleRegistry');

test('repository rule registry is internally consistent and versioned', () => {
  assert.equal(assertRepositoryRuleRegistry(), true);
  assert.equal(registry.detectorId, 'repository.baseline');
  assert.equal(registry.detectorVersion, '1.0.0');
  assert.equal(registry.rulesetVersion, 1);
});

test('repository finding IDs resolve to immutable rule provenance', () => {
  const rule = getRepositoryRuleForFinding('github-token-indicator');
  assert.equal(rule.id, 'repository.secret.github_token');
  assert.equal(rule.version, 1);
  assert.equal(rule.defaultSeverity, 'critical');
});

test('unknown repository finding mapping fails closed', () => {
  assert.throws(
    () => getRepositoryRuleForFinding('unknown-indicator'),
    /Unknown GuardAI repository finding mapping/,
  );
});
