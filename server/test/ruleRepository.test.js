const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mapRule,
  mapRuleVersion,
  normalizeRuleLimit,
} = require('../repositories/ruleRepository');


test('Rule Catalog limit defaults and stays bounded', () => {
  assert.equal(normalizeRuleLimit(undefined), 50);
  assert.equal(normalizeRuleLimit('1'), 1);
  assert.equal(normalizeRuleLimit('100'), 100);
  assert.throws(
    () => normalizeRuleLimit('101'),
    (error) => error.code === 'INVALID_RULE_LIMIT' && error.statusCode === 400,
  );
});


test('Rule row mapping follows the actual GuardAI core schema only', () => {
  const row = {
    id: 'security.content_security_policy',
    category: 'headers',
    title: 'Content-Security-Policy presence',
    current_version: 2,
    active: true,
    created_at: '2026-08-19T10:00:00.000Z',
    updated_at: '2026-08-19T11:00:00.000Z',
  };
  const mapped = mapRule(row);
  assert.deepEqual(mapped, {
    id: row.id,
    category: 'headers',
    title: row.title,
    currentVersion: 2,
    active: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
  assert.equal(Object.prototype.hasOwnProperty.call(mapped, 'framework'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(mapped, 'controlKey'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(mapped, 'status'), false);
});


test('Rule version mapping exposes immutable canonical definition provenance', () => {
  const definition = {
    rulesetId: 'security-baseline',
    rulesetVersion: 1,
    detectorId: 'security.headers',
    detectorVersion: '1.1.0',
    rule: {
      findingId: 'missing-csp',
      category: 'headers',
      defaultSeverity: 'critical',
      evidenceRequirements: ['Final HTTP response headers'],
      detectorLogic: 'Fail when CSP is absent.',
      severityLogic: 'Critical in this baseline.',
      confidenceLogic: 'Observed response only.',
      messageTemplate: 'CSP was not observed.',
      remediation: 'Add a suitable CSP.',
      requirementMappings: [],
      changelog: 'v1: initial Rule.',
    },
  };
  const row = {
    rule_id: 'security.content_security_policy',
    version: 1,
    implementation_version: 'security.headers@1.1.0',
    legal_source_ids: [],
    definition,
    definition_hash: 'a'.repeat(64),
    changed_at: '2026-08-19T12:00:00.000Z',
  };
  const mapped = mapRuleVersion(row);
  assert.deepEqual(mapped, {
    ruleId: row.rule_id,
    version: 1,
    implementationVersion: row.implementation_version,
    legalSourceIds: [],
    definition,
    definitionHash: row.definition_hash,
    changedAt: row.changed_at,
  });
  assert.equal(Object.prototype.hasOwnProperty.call(mapped, 'rationale'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(mapped, 'effectiveFrom'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(mapped, 'config'), false);
});
