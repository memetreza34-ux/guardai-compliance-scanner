const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAssessmentResult } = require('../domain/assessmentResult');

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
  assert.equal(result.score, 75);
  assert.equal(result.issues[0].remediation, 'Add CSP.');
  assert.equal(result.issues[0].ruleId, 'security.content_security_policy');
  assert.equal(result.issues[0].ruleVersion, 1);
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
});

test('allows both rule fields to be absent for future unversioned modules', () => {
  const issue = { ...valid.issues[0] };
  delete issue.ruleId;
  delete issue.ruleVersion;
  const result = normalizeAssessmentResult({ ...valid, issues: [issue] });
  assert.equal(result.issues[0].ruleId, null);
  assert.equal(result.issues[0].ruleVersion, null);
});

test('rejects non-object evidence payloads', () => {
  assert.throws(() => normalizeAssessmentResult({ ...valid, normalizedData: [] }), /object/i);
});
