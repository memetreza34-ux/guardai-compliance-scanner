const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSecurityAssessment } = require('../scanners/securityHeaders');


test('secure response with required headers produces assessed evidence', () => {
  const result = buildSecurityAssessment(
    {
      'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
      'strict-transport-security': 'max-age=31536000',
    },
    'https://example.com/',
  );

  assert.equal(result.detectorId, 'security.headers');
  assert.equal(result.category.score, 100);
  assert.equal(result.category.issues.length, 0);
  assert.equal(result.evidence.secureTransport, true);
  assert.equal(result.evidence.frameProtection.mechanism, 'csp-frame-ancestors');
});


test('plain HTTP is a critical transport finding and HSTS is not double-counted', () => {
  const result = buildSecurityAssessment({}, 'http://example.com/');

  assert.equal(result.evidence.hsts.applicable, false);
  assert.equal(result.category.totalChecks, 3);
  assert.ok(result.category.issues.some((issue) => issue.id === 'insecure-http-transport'));
  assert.ok(!result.category.issues.some((issue) => issue.id === 'missing-hsts'));
  assert.equal(result.category.status, 'critical');
});


test('x-frame-options is recognized as frame protection', () => {
  const result = buildSecurityAssessment(
    {
      'content-security-policy': "default-src 'self'",
      'strict-transport-security': 'max-age=31536000',
      'x-frame-options': 'DENY',
    },
    'https://example.com/',
  );

  assert.equal(result.evidence.frameProtection.present, true);
  assert.equal(result.evidence.frameProtection.mechanism, 'x-frame-options');
});
