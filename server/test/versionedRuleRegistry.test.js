const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createVersionedRuleRegistry,
  sha256Canonical,
  stableJson,
} = require('../rules/versionedRuleRegistry');

function rule(overrides = {}) {
  return {
    id: 'test.rule_one',
    version: 1,
    findingId: 'test-finding-one',
    category: 'test',
    title: 'Test rule',
    defaultSeverity: 'warning',
    evidenceRequirements: ['Observed response header'],
    detectorLogic: 'Fail when the bounded deterministic observation is absent.',
    severityLogic: 'Warning for the initial technical baseline.',
    confidenceLogic: 'High confidence for the observed response only.',
    messageTemplate: 'The expected technical observation was not present.',
    remediation: 'Configure the expected control and run a new assessment.',
    requirementMappings: [],
    changelog: 'v1: initial rule.',
    ...overrides,
  };
}

function source(ruleValue = rule()) {
  return {
    rulesetId: 'test-rules',
    rulesetVersion: 1,
    detectorId: 'test.detector',
    detectorVersion: '1.0.0',
    rules: [ruleValue],
  };
}

test('canonical JSON and SHA-256 are stable across object key order', () => {
  const left = { b: 2, a: { y: 2, x: 1 } };
  const right = { a: { x: 1, y: 2 }, b: 2 };
  assert.equal(stableJson(left), stableJson(right));
  assert.equal(sha256Canonical(left), sha256Canonical(right));
});

test('same versioned Rule definition yields same immutable definition hash', () => {
  const first = createVersionedRuleRegistry(source());
  const reordered = source({
    changelog: 'v1: initial rule.',
    requirementMappings: [],
    remediation: 'Configure the expected control and run a new assessment.',
    messageTemplate: 'The expected technical observation was not present.',
    confidenceLogic: 'High confidence for the observed response only.',
    severityLogic: 'Warning for the initial technical baseline.',
    detectorLogic: 'Fail when the bounded deterministic observation is absent.',
    evidenceRequirements: ['Observed response header'],
    defaultSeverity: 'warning',
    title: 'Test rule',
    category: 'test',
    findingId: 'test-finding-one',
    version: 1,
    id: 'test.rule_one',
  });
  const second = createVersionedRuleRegistry(reordered);
  assert.equal(first.getRule('test.rule_one').definitionHash, second.getRule('test.rule_one').definitionHash);
  assert.equal(first.manifestHash, second.manifestHash);
});

test('changing Rule content under the same ID/version changes definition hash', () => {
  const first = createVersionedRuleRegistry(source());
  const changed = createVersionedRuleRegistry(source(rule({
    remediation: 'Different remediation text that represents a material versioned definition change.',
  })));
  assert.notEqual(first.getRule('test.rule_one').definitionHash, changed.getRule('test.rule_one').definitionHash);
  assert.notEqual(first.manifestHash, changed.manifestHash);
});

test('Rule registry rejects incomplete or duplicate definitions', () => {
  assert.throws(
    () => createVersionedRuleRegistry(source(rule({ evidenceRequirements: [] }))),
    /Evidence requirements/,
  );
  assert.throws(
    () => createVersionedRuleRegistry(source(rule({ remediation: '' }))),
    /Remediation/,
  );
  assert.throws(
    () => createVersionedRuleRegistry(source(rule({ changelog: '' }))),
    /Changelog/,
  );
  const duplicateSource = source();
  duplicateSource.rules.push({ ...duplicateSource.rules[0] });
  assert.throws(() => createVersionedRuleRegistry(duplicateSource), /Duplicate rule ID/);
});
