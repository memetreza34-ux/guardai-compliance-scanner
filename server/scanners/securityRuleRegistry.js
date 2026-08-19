const source = require('../../shared/rules/security-baseline.json');
const { createVersionedRuleRegistry } = require('../rules/versionedRuleRegistry');

const registry = createVersionedRuleRegistry(source, {
  rulesetId: 'security-baseline',
  detectorId: 'security.headers',
});

function getSecurityRule(ruleId) {
  return registry.getRule(ruleId);
}

function getSecurityRuleForFinding(findingId) {
  return registry.getRuleForFinding(findingId);
}

function assertSecurityRuleRegistry() {
  // Construction already validates every Rule. Keep this public assertion for callers
  // and existing regression tests while all registries share the same canonical core.
  return registry.rules.length > 0 && /^[a-f0-9]{64}$/.test(registry.manifestHash);
}

module.exports = {
  assertSecurityRuleRegistry,
  getSecurityRule,
  getSecurityRuleForFinding,
  registry,
};
