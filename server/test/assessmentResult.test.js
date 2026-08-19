const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAssessmentResult } = require('../domain/assessmentResult');

const ruleDefinitionHash = 'a'.repeat(64);
const valid = {
  detectorId: 'security.headers',
  detectorVersion: '1.1.0',
  evidenceType: 'website-security-baseline',
  source: 'https://example.com/',
  normalizedData: { secureTransport: true },
  score: 75,
  issues: [
    {
      id: 'missing-csp',
      ruleId: 'security.content_security_policy',
      ruleVersion: 1,
      ruleDefinitionHash,
      title: 'Missing CSP',
      description: 'No CSP observed.',
      severity: 'warning',
      fixSuggestion: 'Add CSP.',
    },
  ],
  notices: ['Technical screening only.'],
};

test('normalizes a valid assessment result with immutable rule provenance', () => {
  const result = normalizeAssessmentResult(valid);
  assert.equal(result.state, 'assessed');
  assert.equal(result.score, 75);
  assert.equal(result.issues[0].remediation, 'Add CSP.');
  assert.equal(result.issues[0].ruleId, 'security.content_security_policy');
  assert.equal(result.issues[0].ruleVersion, 1);
  assert.equal(result.issues[0].ruleDefinitionHash, ruleDefinitionHash);
});

test('observed-only evidence remains explicitly unscored', () => {
  const result = normalizeAssessmentResult({
    state: 'observed',
    detectorId: 'privacy.browser-observation',
    detectorVersion: '0.1.0',
    evidenceType: 'privacy-browser-observation',
    source: 'https://example.com',
    normalizedData: { consent: { bannerDetected: false } },
    score: null,
    issues: [],
    notices: ['Technical observation only.'],
  });

  assert.equal(result.state, 'observed');
  assert.equal(result.score, null);
  assert.deepEqual(result.issues, []);
});

test('observed-only evidence rejects accidental numeric scoring', () => {
  assert.throws(
    () => normalizeAssessmentResult({
      ...valid,
      state: 'observed',
      score: 100,
      issues: [],
    }),
    (error) => error.code === 'INVALID_WORKER_RESULT',
  );
});

test('rejects invalid scores and severities', () => {
  assert.throws(() => normalizeAssessmentResult({ ...valid, score: 101 }), /invalid/i);
  assert.throws(() => normalizeAssessmentResult({
    ...valid,
    issues: [{ ...valid.issues[0], severity: 'fatal' }],
  }), /invalid/i);
});

test('rejects incomplete or invalid rule provenance', () => {
  assert.throws(
    () => normalizeAssessmentResult({
      ...valid,
      issues: [{ ...valid.issues[0], ruleVersion: undefined }],
    }),
    (error) => error.code === 'INVALID_WORKER_RESULT',
  );
  assert.throws(
    () => normalizeAssessmentResult({
      ...valid,
      issues: [{ ...valid.issues[0], ruleDefinitionHash: undefined }],
    }),
    (error) => error.code === 'INVALID_WORKER_RESULT',
  );
  assert.throws(
    () => normalizeAssessmentResult({
      ...valid,
      issues: [{ ...valid.issues[0], ruleVersion: 0 }],
    }),
    (error) => error.code === 'INVALID_WORKER_RESULT',
  );
  assert.throws(
    () => normalizeAssessmentResult({
      ...valid,
      issues: [{ ...valid.issues[0], ruleId: 'BAD RULE' }],
    }),
    (error) => error.code === 'INVALID_WORKER_RESULT',
  );
  assert.throws(
    () => normalizeAssessmentResult({
      ...valid,
      issues: [{ ...valid.issues[0], ruleDefinitionHash: 'not-a-sha256' }],
    }),
    (error) => error.code === 'INVALID_WORKER_RESULT',
  );
});

test('allows all Rule provenance fields to be absent for unversioned observation modules', () => {
  const issue = { ...valid.issues[0] };
  delete issue.ruleId;
  delete issue.ruleVersion;
  delete issue.ruleDefinitionHash;
  const result = normalizeAssessmentResult({ ...valid, issues: [issue] });
  assert.equal(result.issues[0].ruleId, null);
  assert.equal(result.issues[0].ruleVersion, null);
  assert.equal(result.issues[0].ruleDefinitionHash, null);
});

test('rejects non-object evidence payloads', () => {
  assert.throws(() => normalizeAssessmentResult({ ...valid, normalizedData: [] }), /object/i);
});
