const { HttpError } = require('../lib/httpError');

function createRuleService({ ruleRepository }) {
  if (!ruleRepository) {
    throw new TypeError('Rule service requires a Rule repository.');
  }

  async function list({ framework, status, limit }) {
    return ruleRepository.listRules({
      framework: framework || null,
      status: status || 'active',
      limit,
    });
  }

  async function get(ruleId) {
    const rule = await ruleRepository.getRule(ruleId);
    if (!rule) {
      throw new HttpError(404, 'Rule was not found.', 'RULE_NOT_FOUND');
    }
    return rule;
  }

  async function versions(ruleId) {
    const rule = await get(ruleId);
    const versions = await ruleRepository.listRuleVersions(ruleId);
    return { rule, versions };
  }

  async function version(ruleId, versionNumber) {
    const rule = await get(ruleId);
    const version = await ruleRepository.getRuleVersion(ruleId, versionNumber);
    if (!version) {
      throw new HttpError(404, 'Rule version was not found.', 'RULE_VERSION_NOT_FOUND');
    }
    return { rule, version };
  }

  return { get, list, version, versions };
}

module.exports = { createRuleService };
