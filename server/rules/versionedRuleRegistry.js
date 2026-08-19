const crypto = require('node:crypto');

const RULE_ID_RE = /^[a-z0-9][a-z0-9._-]{2,119}$/;
const FINDING_ID_RE = /^[a-z0-9][a-z0-9-]{2,159}$/;
const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{1,79}$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const SEVERITIES = Object.freeze(['critical', 'warning', 'info']);

function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableJson(entry)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
}

function sha256Canonical(value) {
  return crypto.createHash('sha256').update(stableJson(value), 'utf8').digest('hex');
}

function assertText(value, label, { min = 1, max = 2000 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
    throw new Error(`${label} must contain ${min}-${max} characters.`);
  }
  return value;
}

function assertStringArray(value, label, { allowEmpty = false, maxItems = 50 } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.length > maxItems) {
    throw new Error(`${label} must be an array with an allowed item count.`);
  }
  const seen = new Set();
  for (const entry of value) {
    assertText(entry, `${label} entry`, { min: 1, max: 500 });
    if (seen.has(entry)) throw new Error(`${label} contains a duplicate entry.`);
    seen.add(entry);
  }
  return value;
}

function validateRuleDefinition(rule, ruleset) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    throw new Error(`Rule in ${ruleset.rulesetId} must be an object.`);
  }
  if (!RULE_ID_RE.test(rule.id || '')) throw new Error(`Invalid rule ID: ${rule.id}`);
  if (!Number.isInteger(rule.version) || rule.version < 1) throw new Error(`Invalid rule version: ${rule.id}`);
  if (!FINDING_ID_RE.test(rule.findingId || '')) throw new Error(`Invalid finding ID: ${rule.id}`);
  if (!TOKEN_RE.test(rule.category || '')) throw new Error(`Invalid rule category: ${rule.id}`);
  assertText(rule.title, `Rule title ${rule.id}`, { max: 200 });
  if (!SEVERITIES.includes(rule.defaultSeverity)) throw new Error(`Invalid default severity: ${rule.id}`);
  assertStringArray(rule.evidenceRequirements, `Evidence requirements ${rule.id}`);
  assertText(rule.detectorLogic, `Detector logic ${rule.id}`, { max: 2000 });
  assertText(rule.severityLogic, `Severity logic ${rule.id}`, { max: 1000 });
  assertText(rule.confidenceLogic, `Confidence logic ${rule.id}`, { max: 1000 });
  assertText(rule.messageTemplate, `Message template ${rule.id}`, { max: 1000 });
  assertText(rule.remediation, `Remediation ${rule.id}`, { max: 2000 });
  assertStringArray(rule.requirementMappings, `Requirement mappings ${rule.id}`, { allowEmpty: true });
  assertText(rule.changelog, `Changelog ${rule.id}`, { max: 1000 });

  const canonical = Object.freeze({
    id: rule.id,
    version: rule.version,
    findingId: rule.findingId,
    category: rule.category,
    title: rule.title,
    defaultSeverity: rule.defaultSeverity,
    evidenceRequirements: Object.freeze([...rule.evidenceRequirements]),
    detectorLogic: rule.detectorLogic,
    severityLogic: rule.severityLogic,
    confidenceLogic: rule.confidenceLogic,
    messageTemplate: rule.messageTemplate,
    remediation: rule.remediation,
    requirementMappings: Object.freeze([...rule.requirementMappings]),
    changelog: rule.changelog,
  });

  return Object.freeze({
    ...canonical,
    definitionHash: sha256Canonical({
      rulesetId: ruleset.rulesetId,
      rulesetVersion: ruleset.rulesetVersion,
      detectorId: ruleset.detectorId,
      detectorVersion: ruleset.detectorVersion,
      rule: canonical,
    }),
  });
}

function createVersionedRuleRegistry(source, expected = {}) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Rule registry source must be an object.');
  }
  if (!TOKEN_RE.test(source.rulesetId || '')) throw new Error('Rule registry ruleset ID is invalid.');
  if (!Number.isInteger(source.rulesetVersion) || source.rulesetVersion < 1) {
    throw new Error('Rule registry ruleset version is invalid.');
  }
  if (!TOKEN_RE.test(source.detectorId || '')) throw new Error('Rule registry detector ID is invalid.');
  if (!SEMVER_RE.test(source.detectorVersion || '')) throw new Error('Rule registry detector version is invalid.');
  if (expected.rulesetId && source.rulesetId !== expected.rulesetId) {
    throw new Error(`Expected ruleset ${expected.rulesetId}, received ${source.rulesetId}.`);
  }
  if (expected.detectorId && source.detectorId !== expected.detectorId) {
    throw new Error(`Expected detector ${expected.detectorId}, received ${source.detectorId}.`);
  }
  if (!Array.isArray(source.rules) || source.rules.length === 0 || source.rules.length > 500) {
    throw new Error('Rule registry must contain 1-500 rules.');
  }

  const rules = source.rules.map((rule) => validateRuleDefinition(rule, source));
  const byId = new Map();
  const byFindingId = new Map();
  for (const rule of rules) {
    if (byId.has(rule.id)) throw new Error(`Duplicate rule ID: ${rule.id}`);
    if (byFindingId.has(rule.findingId)) throw new Error(`Duplicate finding ID: ${rule.findingId}`);
    byId.set(rule.id, rule);
    byFindingId.set(rule.findingId, rule);
  }

  const manifest = Object.freeze({
    rulesetId: source.rulesetId,
    rulesetVersion: source.rulesetVersion,
    detectorId: source.detectorId,
    detectorVersion: source.detectorVersion,
    ruleCount: rules.length,
    rules: Object.freeze(rules.map((rule) => Object.freeze({
      id: rule.id,
      version: rule.version,
      findingId: rule.findingId,
      definitionHash: rule.definitionHash,
    }))),
  });
  const manifestHash = sha256Canonical(manifest);

  return Object.freeze({
    rulesetId: source.rulesetId,
    rulesetVersion: source.rulesetVersion,
    detectorId: source.detectorId,
    detectorVersion: source.detectorVersion,
    rules: Object.freeze(rules),
    manifest,
    manifestHash,
    getRule(ruleId) {
      const rule = byId.get(ruleId);
      if (!rule) throw new Error(`Unknown GuardAI rule: ${ruleId}`);
      return rule;
    },
    getRuleForFinding(findingId) {
      const rule = byFindingId.get(findingId);
      if (!rule) throw new Error(`Unknown GuardAI finding mapping: ${findingId}`);
      return rule;
    },
    hasRule(ruleId, version) {
      const rule = byId.get(ruleId);
      return Boolean(rule && rule.version === version);
    },
  });
}

module.exports = {
  createVersionedRuleRegistry,
  sha256Canonical,
  stableJson,
  validateRuleDefinition,
};
