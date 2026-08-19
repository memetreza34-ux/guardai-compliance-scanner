const source = require('../../shared/rules/repository-baseline.json');
const { createVersionedRuleRegistry } = require('../rules/versionedRuleRegistry');

const registry = createVersionedRuleRegistry(source, {
  rulesetId: 'repository-baseline',
  detectorId: 'repository.baseline',
});

function getRepositoryRule(ruleId) {
  return registry.getRule(ruleId);
}

function getRepositoryRuleForFinding(findingId) {
  return registry.getRuleForFinding(findingId);
}

function assertRepositoryRuleRegistry() {
  return registry.rules.length > 0 && /^[a-f0-9]{64}$/.test(registry.manifestHash);
}

module.exports = {
  assertRepositoryRuleRegistry,
  getRepositoryRule,
  getRepositoryRuleForFinding,
  registry,
};
