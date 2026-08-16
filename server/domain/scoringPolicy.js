const defaultProfile = require('../../shared/scoring/security-mvp-v1.json');
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
  if (!profile.modules || typeof profile.modules !== 'object' || Array.isArray(profile.modules)) {
    throw new TypeError('Scoring profile modules are invalid.');
  }

  const moduleEntries = Object.entries(profile.modules);
  if (moduleEntries.length === 0) {
    throw new TypeError('Scoring profile must contain at least one module.');
  }
  for (const [moduleId, config] of moduleEntries) {
    if (!/^[a-z0-9][a-z0-9._-]{1,79}$/.test(moduleId)) {
      throw new TypeError(`Scoring module ID is invalid: ${moduleId}`);
    }
    if (!config || typeof config !== 'object' || !Number.isFinite(config.weight) || config.weight <= 0) {
      throw new TypeError(`Scoring weight is invalid: ${moduleId}`);
    }
  }

  if (!Number.isInteger(profile.minimumAssessedModules) || profile.minimumAssessedModules < 1) {
    throw new TypeError('minimumAssessedModules is invalid.');
  }
  return profile;
}

function computeWeightedScanScore(moduleResults, profile = defaultProfile) {
  validateScoringProfile(profile);
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
    assessedModules: assessed.map((entry) => entry.moduleId),
  };
}

validateScoringProfile(defaultProfile);

module.exports = {
  computeWeightedScanScore,
  defaultProfile,
  validateScoringProfile,
};