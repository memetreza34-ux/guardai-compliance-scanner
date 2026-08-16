const { HttpError } = require('../lib/httpError');

const SEVERITIES = new Set(['critical', 'warning', 'info']);

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeText(value, field, maxLength, { optional = false } = {}) {
  if (optional && (value === null || value === undefined || value === '')) return null;
  if (typeof value !== 'string') {
    throw new HttpError(500, `Worker result field ${field} is invalid.`, 'INVALID_WORKER_RESULT');
  }
  const text = value.trim();
  if (text.length === 0 || text.length > maxLength) {
    throw new HttpError(500, `Worker result field ${field} is invalid.`, 'INVALID_WORKER_RESULT');
  }
  return text;
}

function normalizeAssessmentResult(result) {
  if (!isPlainObject(result)) {
    throw new HttpError(500, 'Worker assessment result is invalid.', 'INVALID_WORKER_RESULT');
  }

  if (!Number.isInteger(result.score) || result.score < 0 || result.score > 100) {
    throw new HttpError(500, 'Worker assessment score is invalid.', 'INVALID_WORKER_RESULT');
  }

  if (!isPlainObject(result.normalizedData)) {
    throw new HttpError(500, 'Worker evidence payload must be an object.', 'INVALID_WORKER_RESULT');
  }

  if (!Array.isArray(result.issues) || result.issues.length > 100) {
    throw new HttpError(500, 'Worker findings are invalid.', 'INVALID_WORKER_RESULT');
  }

  const issues = result.issues.map((issue) => {
    if (!isPlainObject(issue) || !SEVERITIES.has(issue.severity)) {
      throw new HttpError(500, 'Worker finding is invalid.', 'INVALID_WORKER_RESULT');
    }

    return {
      id: normalizeText(issue.id, 'issue.id', 160),
      title: normalizeText(issue.title, 'issue.title', 300),
      description: normalizeText(issue.description, 'issue.description', 4000),
      severity: issue.severity,
      remediation: normalizeText(issue.remediation ?? issue.fixSuggestion, 'issue.remediation', 4000, { optional: true }),
    };
  });

  const notices = Array.isArray(result.notices)
    ? result.notices.map((notice) => normalizeText(notice, 'notice', 1000)).slice(0, 20)
    : [];

  return {
    detectorId: normalizeText(result.detectorId, 'detectorId', 120),
    detectorVersion: normalizeText(result.detectorVersion, 'detectorVersion', 80),
    evidenceType: normalizeText(result.evidenceType, 'evidenceType', 120),
    source: normalizeText(result.source, 'source', 2048),
    normalizedData: result.normalizedData,
    score: result.score,
    issues,
    notices,
  };
}

module.exports = {
  isPlainObject,
  normalizeAssessmentResult,
};