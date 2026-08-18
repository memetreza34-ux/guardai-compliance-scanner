const registry = require('../../shared/rules/repository-baseline.json');

const rulesById = new Map(registry.rules.map((rule) => [rule.id, Object.freeze({ ...rule })]));
const rulesByFindingId = new Map(registry.rules.map((rule) => [rule.findingId, Object.freeze({ ...rule })]));

function getRepositoryRuleForFinding(findingId) {
  const rule = rulesByFindingId.get(findingId);
  if (!rule) throw new Error(`Unknown GuardAI repository finding mapping: ${findingId}`);
  return rule;
}

function assertRepositoryRuleRegistry() {
  if (registry.detectorId !== 'repository.baseline') {
    throw new Error('Repository rule registry detector ID is invalid.');
  }
  if (!/^\d+\.\d+\.\d+$/.test(registry.detectorVersion)) {
    throw new Error('Repository rule registry detector version is invalid.');
  }
  if (!Number.isInteger(registry.rulesetVersion) || registry.rulesetVersion < 1) {
    throw new Error('Repository ruleset version is invalid.');
  }
  if (rulesById.size !== registry.rules.length || rulesByFindingId.size !== registry.rules.length) {
    throw new Error('Repository rule registry contains duplicate IDs.');
  }
  for (const rule of registry.rules) {
    if (!/^[a-z0-9][a-z0-9._-]{2,119}$/.test(rule.id)) {
      throw new Error(`Invalid repository rule ID: ${rule.id}`);
    }
    if (!Number.isInteger(rule.version) || rule.version < 1) {
      throw new Error(`Invalid repository rule version: ${rule.id}`);
    }
    if (typeof rule.findingId !== 'string' || !/^[a-z0-9][a-z0-9-]{2,159}$/.test(rule.findingId)) {
      throw new Error(`Invalid repository finding ID: ${rule.id}`);
    }
    if (!['critical', 'warning', 'info'].includes(rule.defaultSeverity)) {
      throw new Error(`Invalid repository severity: ${rule.id}`);
    }
  }
  return true;
}

module.exports = {
  assertRepositoryRuleRegistry,
  getRepositoryRuleForFinding,
  registry,
};
