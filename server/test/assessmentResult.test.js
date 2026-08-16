const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAssessmentResult } = require('../domain/assessmentResult');

const valid = {
  detectorId: 'security.headers',
  detectorVersion: '1.0.0',
  evidenceType: 'http-security-headers',
  source: 'https://example.com/',
  normalizedData: { secureTransport: true },
  score: 75,
  issues: [
    {
      id: 'missing-csp',
      title: 'Missing CSP',
      description: 'No CSP observed.',
      severity: 'warning',
      fixSuggestion: 'Add CSP.',
    },
  ],
  notices: ['Technical screening only.'],
};

test('normalizes a valid assessment result', () => {
  const result = normalizeAssessmentResult(valid);
  assert.equal(result.score, 75);
  assert.equal(result.issues[0].remediation, 'Add CSP.');
});

test('rejects invalid scores and severities', () => {
  assert.throws(() => normalizeAssessmentResult({ ...valid, score: 101 }), /invalid/i);
  assert.throws(() => normalizeAssessmentResult({
    ...valid,
    issues: [{ ...valid.issues[0], severity: 'fatal' }],
  }), /invalid/i);
});

test('rejects non-object evidence payloads', () => {
  assert.throws(() => normalizeAssessmentResult({ ...valid, normalizedData: [] }), /object/i);
});