const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertScoringProfileMatches,
  mapScanRow,
} = require('../repositories/scanRepository');
const { securityProfile } = require('../domain/scoringPolicy');

test('Scan mapping retains immutable scoring profile definition hash', () => {
  const row = {
    id: '11111111-1111-4111-8111-111111111111',
    organization_id: '22222222-2222-4222-8222-222222222222',
    target_id: '33333333-3333-4333-8333-333333333333',
    requested_by: '44444444-4444-4444-8444-444444444444',
    status: 'queued',
    scanner_version: '0.1.0',
    contract_version: '0.3.0',
    requested_modules: ['security'],
    idempotency_key: 'scan-key',
    scoring_profile_id: securityProfile.profileId,
    scoring_profile_version: securityProfile.version,
    scoring_profile_definition_hash: securityProfile.definitionHash,
    target_snapshot: { type: 'website' },
    created_at: '2026-08-19T10:00:00.000Z',
  };

  const mapped = mapScanRow(row);
  assert.equal(mapped.scoringProfileDefinitionHash, securityProfile.definitionHash);
});

test('idempotent Scan replay fails closed when stored scoring hash differs', () => {
  const existing = {
    scoring_profile_id: securityProfile.profileId,
    scoring_profile_version: securityProfile.version,
    scoring_profile_definition_hash: '0'.repeat(64),
  };

  assert.throws(
    () => assertScoringProfileMatches(existing, securityProfile),
    (error) => error.code === 'SCORING_PROFILE_DEFINITION_MISMATCH' && error.statusCode === 500,
  );
});

test('idempotent Scan replay accepts the exact canonical scoring profile tuple', () => {
  const existing = {
    scoring_profile_id: securityProfile.profileId,
    scoring_profile_version: securityProfile.version,
    scoring_profile_definition_hash: securityProfile.definitionHash,
  };
  assert.doesNotThrow(() => assertScoringProfileMatches(existing, securityProfile));
});
