const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeWeightedScanScore,
  defaultProfile,
  getScoringProfile,
  repositoryProfile,
  selectScoringProfile,
  validateScoringProfile,
} = require('../domain/scoringPolicy');


test('default Security MVP profile is valid and versioned', () => {
  assert.equal(validateScoringProfile(defaultProfile), defaultProfile);
  assert.equal(defaultProfile.profileId, 'security-mvp');
  assert.equal(defaultProfile.version, 1);
  assert.equal(getScoringProfile('security-mvp', 1), defaultProfile);
});


test('repository MVP profile is valid, versioned and target-specific', () => {
  assert.equal(validateScoringProfile(repositoryProfile), repositoryProfile);
  assert.equal(repositoryProfile.profileId, 'repository-mvp');
  assert.equal(repositoryProfile.version, 1);
  assert.equal(getScoringProfile('repository-mvp', 1), repositoryProfile);
  assert.equal(selectScoringProfile('repository', ['repository']), repositoryProfile);
});


test('website Security scan selects Security MVP profile', () => {
  assert.equal(selectScoringProfile('website', ['security']), defaultProfile);
});


test('unsupported scoring target/module combination fails closed', () => {
  assert.throws(
    () => selectScoringProfile('repository', ['security']),
    (error) => error.code === 'SCORING_PROFILE_NOT_AVAILABLE' && error.statusCode === 422,
  );
});


test('unknown scoring profile version fails closed', () => {
  assert.throws(
    () => getScoringProfile('security-mvp', 2),
    (error) => error.code === 'SCORING_PROFILE_NOT_AVAILABLE' && error.statusCode === 500,
  );
});


test('Security MVP score equals the assessed Security module score', () => {
  const result = computeWeightedScanScore({
    security: { state: 'assessed', score: 83 },
  });
  assert.deepEqual(result, {
    score: 83,
    state: 'scored',
    profileId: 'security-mvp',
    profileVersion: 1,
    assessedModules: ['security'],
  });
});


test('repository MVP score equals the assessed repository baseline score', () => {
  const result = computeWeightedScanScore({
    repository: { state: 'assessed', score: 100 },
  }, repositoryProfile);
  assert.deepEqual(result, {
    score: 100,
    state: 'scored',
    profileId: 'repository-mvp',
    profileVersion: 1,
    assessedModules: ['repository'],
  });
});


test('missing assessed coverage returns no numeric score', () => {
  const result = computeWeightedScanScore({
    security: { state: 'not_assessed' },
  });
  assert.equal(result.score, null);
  assert.equal(result.state, 'insufficient_coverage');
});


test('future multi-module profile uses explicit weights only', () => {
  const profile = {
    profileId: 'test-profile',
    version: 1,
    description: 'test only',
    modules: {
      security: { weight: 2 },
      privacy: { weight: 1 },
    },
    minimumAssessedModules: 1,
  };
  const result = computeWeightedScanScore({
    security: { state: 'assessed', score: 90 },
    privacy: { state: 'assessed', score: 60 },
  }, profile);
  assert.equal(result.score, 80);
});
