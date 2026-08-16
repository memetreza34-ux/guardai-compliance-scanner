const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computeWeightedScanScore,
  defaultProfile,
  validateScoringProfile,
} = require('../domain/scoringPolicy');


test('default Security MVP profile is valid and versioned', () => {
  assert.equal(validateScoringProfile(defaultProfile), defaultProfile);
  assert.equal(defaultProfile.profileId, 'security-mvp');
  assert.equal(defaultProfile.version, 1);
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