const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateScoringProfileHash,
  computeWeightedScanScore,
  createVersionedScoringProfile,
  defaultProfile,
  getScoringProfile,
  repositoryProfile,
  selectScoringProfile,
  validateScoringProfile,
} = require('../domain/scoringPolicy');


test('default Security MVP profile is valid, versioned and hashed', () => {
  assert.equal(validateScoringProfile(defaultProfile), defaultProfile);
  assert.equal(defaultProfile.profileId, 'security-mvp');
  assert.equal(defaultProfile.version, 1);
  assert.match(defaultProfile.definitionHash, /^[a-f0-9]{64}$/);
  assert.equal(calculateScoringProfileHash(defaultProfile), defaultProfile.definitionHash);
  assert.equal(getScoringProfile('security-mvp', 1), defaultProfile);
  assert.equal(getScoringProfile('security-mvp', 1, defaultProfile.definitionHash), defaultProfile);
});


test('repository MVP profile is valid, versioned and target-specific', () => {
  assert.equal(validateScoringProfile(repositoryProfile), repositoryProfile);
  assert.equal(repositoryProfile.profileId, 'repository-mvp');
  assert.equal(repositoryProfile.version, 1);
  assert.match(repositoryProfile.definitionHash, /^[a-f0-9]{64}$/);
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


test('unknown scoring profile version or wrong definition hash fails closed', () => {
  assert.throws(
    () => getScoringProfile('security-mvp', 2),
    (error) => error.code === 'SCORING_PROFILE_NOT_AVAILABLE' && error.statusCode === 500,
  );
  assert.throws(
    () => getScoringProfile('security-mvp', 1, '0'.repeat(64)),
    (error) => error.code === 'SCORING_PROFILE_DEFINITION_MISMATCH' && error.statusCode === 500,
  );
});


test('Security MVP score equals assessed Security score and carries profile hash', () => {
  const result = computeWeightedScanScore({
    security: { state: 'assessed', score: 83 },
  });
  assert.deepEqual(result, {
    score: 83,
    state: 'scored',
    profileId: 'security-mvp',
    profileVersion: 1,
    profileDefinitionHash: defaultProfile.definitionHash,
    assessedModules: ['security'],
  });
});


test('repository MVP score equals assessed repository baseline score', () => {
  const result = computeWeightedScanScore({
    repository: { state: 'assessed', score: 100 },
  }, repositoryProfile);
  assert.deepEqual(result, {
    score: 100,
    state: 'scored',
    profileId: 'repository-mvp',
    profileVersion: 1,
    profileDefinitionHash: repositoryProfile.definitionHash,
    assessedModules: ['repository'],
  });
});


test('missing assessed coverage returns no numeric score but preserves scoring provenance', () => {
  const result = computeWeightedScanScore({
    security: { state: 'not_assessed' },
  });
  assert.equal(result.score, null);
  assert.equal(result.state, 'insufficient_coverage');
  assert.equal(result.profileDefinitionHash, defaultProfile.definitionHash);
});


test('future multi-module profile uses explicit weights only', () => {
  const profile = createVersionedScoringProfile({
    profileId: 'test-profile',
    version: 1,
    description: 'test only',
    modules: {
      security: { weight: 2 },
      privacy: { weight: 1 },
    },
    minimumAssessedModules: 1,
  });
  const result = computeWeightedScanScore({
    security: { state: 'assessed', score: 90 },
    privacy: { state: 'assessed', score: 60 },
  }, profile);
  assert.equal(result.score, 80);
  assert.equal(result.profileDefinitionHash, profile.definitionHash);
});


test('Scoring hash is stable for the same definition and changes for semantic changes', () => {
  const base = {
    profileId: 'hash-profile',
    version: 1,
    description: 'Hash test profile',
    modules: {
      security: { weight: 2 },
      privacy: { weight: 1 },
    },
    minimumAssessedModules: 1,
  };
  const first = createVersionedScoringProfile(base);
  const reordered = createVersionedScoringProfile({
    minimumAssessedModules: 1,
    modules: {
      privacy: { weight: 1 },
      security: { weight: 2 },
    },
    description: 'Hash test profile',
    version: 1,
    profileId: 'hash-profile',
  });
  assert.equal(first.definitionHash, reordered.definitionHash);

  assert.notEqual(
    first.definitionHash,
    createVersionedScoringProfile({ ...base, modules: { security: { weight: 3 }, privacy: { weight: 1 } } }).definitionHash,
  );
  assert.notEqual(
    first.definitionHash,
    createVersionedScoringProfile({ ...base, description: 'Changed scope description' }).definitionHash,
  );
  assert.notEqual(
    first.definitionHash,
    createVersionedScoringProfile({ ...base, minimumAssessedModules: 2 }).definitionHash,
  );
});
