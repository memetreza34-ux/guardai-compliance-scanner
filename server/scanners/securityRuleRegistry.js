const registry = require('../../shared/rules/security-baseline.json');

const rulesById = new Map(registry.rules.map((rule) => [rule.id, Object.freeze({ ...rule })]));

function getSecurityRule(ruleId) {
  const rule = rulesById.get(ruleId);
  if (!rule) {
    throw new Error(`Unknown GuardAI security rule: ${ruleId}`);
  }
  return rule;
}

function assertSecurityRuleRegistry() {
  if (registry.detectorId !== 'security.headers') {
    throw new Error('Security rule registry detector ID is invalid.');
  }
  if (!/^\d+\.\d+\.\d+$/.test(registry.detectorVersion)) {
    throw new Error('Security rule registry detector version is invalid.');
  }
  if (!Number.isInteger(registry.rulesetVersion) || registry.rulesetVersion < 1) {
    throw new Error('Security ruleset version is invalid.');
  }
  if (rulesById.size !== registry.rules.length) {
    throw new Error('Security rule registry contains duplicate rule IDs.');
  }

  for (const rule of registry.rules) {
    if (!/^[a-z0-9][a-z0-9._-]{2,119}$/.test(rule.id)) {
      throw new Error(`Invalid security rule ID: ${rule.id}`);
    }
    if (!Number.isInteger(rule.version) || rule.version < 1) {
      throw new Error(`Invalid security rule version: ${rule.id}`);
    }
    if (!['critical', 'warning', 'info'].includes(rule.defaultSeverity)) {
      throw new Error(`Invalid security rule severity: ${rule.id}`);
    }
  }

  return true;
}

module.exports = {
  assertSecurityRuleRegistry,
  getSecurityRule,
  registry,
};