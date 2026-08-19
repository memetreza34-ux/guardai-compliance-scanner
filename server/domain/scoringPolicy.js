const securityProfileSource = require('../../shared/scoring/security-mvp-v1.json');
const repositoryProfileSource = require('../../shared/scoring/repository-mvp-v1.json');
const { sha256Canonical } = require('../lib/canonicalJson');
const { HttpError } = require('../lib/httpError');

function validateScoringProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new TypeError('Scoring profile must be an object.');
  }
  if (typeof profile.profileId !== 'string' || !/^[a-z0-9][a-z0-9._-]{2,79}$/.test(profile.profileId)) {
    throw new TypeError('Scoring profile ID is invalid.');
  }
  if (!Number.isInteger(profile.version) || profile.version < 1) {
    throw new TypeError('Scoring profile version is invalid.');
  }
  if (typeof profile.description !== 'string' || profile.description.trim().length < 1 || profile.description.length > 1000) {
    throw new TypeError('Scoring profile description is invalid.');
  }
  if (!profile.modules || typeof profile.modules !== 'object' || Array.isArray(profile.modules)) {
    throw new TypeError('Scoring profile modules are invalid.');
  }

  const moduleEntries = Object.entries(profile.modules);
  if (moduleEntries.length === 0 || moduleEntries.length > 50) {
    throw new TypeError('Scoring profile must contain 1-50 modules.');
  }
  for (const [moduleId, config] of moduleEntries) {
    if (!/^[a-z0-9][a-z0-9._-]{1,79}$/.test(moduleId)) {
      throw new TypeError(`Scoring module ID is invalid: ${moduleId}`);
    }
    if (
      !config ||
      typeof config !== 'object' ||
      Array.isArray(config) ||
      !Number.isFinite(config.weight) ||
      config.weight <= 0 ||
      config.weight > 1000
    ) {
      throw new TypeError(`Scoring weight is invalid: ${moduleId}`);
    }
  }

  if (
    !Number.isInteger(profile.minimumAssessedModules) ||
    profile.minimumAssessedModules < 1 ||
    profile.minimumAssessedModules > moduleEntries.length
  ) {
    throw new TypeError('minimumAssessedModules is invalid.');
  }
  return profile;
}

function scoringProfileDefinition(profile) {
  validateScoringProfile(profile);
  return {
    profileId: profile.profileId,
    version: profile.version,
    description: profile.description,
    modules: Object.fromEntries(
      Object.entries(profile.modules).map(([moduleId, config]) => [moduleId, { weight: config.weight }]),
    ),
    minimumAssessedModules: profile.minimumAssessedModules,
  };
}

function calculateScoringProfileHash(profile) {
  return sha256Canonical(scoringProfileDefinition(profile));
}

function createVersionedScoringProfile(source) {
  const definition = scoringProfileDefinition(source);
  const modules = Object.freeze(Object.fromEntries(
    Object.entries(definition.modules).map(([moduleId, config]) => [moduleId, Object.freeze({ ...config })]),
  ));
  return Object.freeze({
    ...definition,
    modules,
    definitionHash: sha256Canonical(definition),
  });
}

const securityProfile = createVersionedScoringProfile(securityProfileSource);
const repositoryProfile = createVersionedScoringProfile(repositoryProfileSource);
const defaultProfile = securityProfile;
const SCORING_PROFILES = Object.freeze([securityProfile, repositoryProfile]);

function getScoringProfile(profileId, version, expectedDefinitionHash = null) {
  const profile = SCORING_PROFILES.find(
    (candidate) => candidate.profileId === profileId && candidate.version === version,
  );
  if (!profile) {
    throw new HttpError(
      500,
      'Scan references an unsupported scoring profile version.',
      'SCORING_PROFILE_NOT_AVAILABLE',
      { profileId, version },
    );
  }

  if (
    expectedDefinitionHash !== null &&
    expectedDefinitionHash !== undefined &&
    profile.definitionHash !== expectedDefinitionHash
  ) {
    throw new HttpError(
      500,
      'Scan scoring profile definition does not match the current immutable profile registry.',
      'SCORING_PROFILE_DEFINITION_MISMATCH',
      { profileId, version },
    );
  }
  return profile;
}

function selectScoringProfile(targetType, requestedModules) {
  if (!Array.isArray(requestedModules) || requestedModules.length === 0) {
    throw new TypeError('Scoring profile selection requires requested modules.');
  }

  if (
    targetType === 'website' &&
    requestedModules.length === 1 &&
    requestedModules[0] === 'security'
  ) {
    return securityProfile;
  }
  if (
    targetType === 'repository' &&
    requestedModules.length === 1 &&
    requestedModules[0] === 'repository'
  ) {
    return repositoryProfile;
  }

  throw new HttpError(
    422,
    'No versioned scoring profile exists for this target/module combination.',
    'SCORING_PROFILE_NOT_AVAILABLE',
    { targetType, requestedModules },
  );
}

function computeWeightedScanScore(moduleResults, profile = defaultProfile) {
  validateScoringProfile(profile);
  const definitionHash = typeof profile.definitionHash === 'string'
    ? profile.definitionHash
    : calculateScoringProfileHash(profile);
  if (!moduleResults || typeof moduleResults !== 'object' || Array.isArray(moduleResults)) {
    throw new TypeError('Module results must be an object.');
  }

  const assessed = [];
  for (const [moduleId, moduleConfig] of Object.entries(profile.modules)) {
    const result = moduleResults[moduleId];
    if (!result || result.state !== 'assessed') continue;
    if (!Number.isInteger(result.score) || result.score < 0 || result.score > 100) {
      throw new HttpError(500, 'Assessed module score is invalid.', 'INVALID_MODULE_SCORE', { moduleId });
    }
    assessed.push({ moduleId, score: result.score, weight: moduleConfig.weight });
  }

  if (assessed.length < profile.minimumAssessedModules) {
    return {
      score: null,
      state: 'insufficient_coverage',
      profileId: profile.profileId,
      profileVersion: profile.version,
      profileDefinitionHash: definitionHash,
      assessedModules: assessed.map((entry) => entry.moduleId),
    };
  }

  const weightTotal = assessed.reduce((sum, entry) => sum + entry.weight, 0);
  const weightedTotal = assessed.reduce((sum, entry) => sum + entry.score * entry.weight, 0);
  return {
    score: Math.round(weightedTotal / weightTotal),
    state: 'scored',
    profileId: profile.profileId,
    profileVersion: profile.version,
    profileDefinitionHash: definitionHash,
    assessedModules: assessed.map((entry) => entry.moduleId),
  };
}

module.exports = {
  calculateScoringProfileHash,
  computeWeightedScanScore,
  createVersionedScoringProfile,
  defaultProfile,
  getScoringProfile,
  repositoryProfile,
  SCORING_PROFILES,
  scoringProfileDefinition,
  securityProfile,
  selectScoringProfile,
  validateScoringProfile,
};
