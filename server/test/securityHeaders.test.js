const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSecurityAssessment } = require('../scanners/securityHeaders');


test('secure response with scored baseline headers produces 100', () => {
  const result = buildSecurityAssessment(
    {
      'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
      'strict-transport-security': 'max-age=31536000',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(), microphone=()',
    },
    'https://example.com/',
    '<html><body><img src="https://example.com/image.png"></body></html>',
  );

  assert.equal(result.detectorId, 'security.headers');
  assert.equal(result.detectorVersion, '1.1.0');
  assert.equal(result.category.score, 100);
  assert.equal(result.category.issues.length, 0);
  assert.equal(result.evidence.secureTransport, true);
  assert.equal(result.evidence.frameProtection.mechanism, 'csp-frame-ancestors');
  assert.equal(result.evidence.referrerPolicyPresent, true);
  assert.equal(result.evidence.permissionsPolicyPresent, true);
});


test('plain HTTP is a critical transport finding and HSTS is not double-counted', () => {
  const result = buildSecurityAssessment({}, 'http://example.com/');

  assert.equal(result.evidence.hsts.applicable, false);
  assert.equal(result.category.totalChecks, 4);
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
      'x-content-type-options': 'nosniff',
    },
    'https://example.com/',
  );

  assert.equal(result.evidence.frameProtection.present, true);
  assert.equal(result.evidence.frameProtection.mechanism, 'x-frame-options');
});


test('HTTPS Set-Cookie without Secure is reported without persisting cookie values', () => {
  const result = buildSecurityAssessment(
    {
      'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
      'strict-transport-security': 'max-age=31536000',
      'x-content-type-options': 'nosniff',
      'set-cookie': [
        'session=secret-value; Path=/; HttpOnly; SameSite=Lax',
        'theme=dark; Path=/; Secure; SameSite=Lax',
      ],
    },
    'https://example.com/',
  );

  assert.equal(result.evidence.cookies.observed, 2);
  assert.equal(result.evidence.cookies.missingSecure, 1);
  assert.ok(result.category.issues.some((issue) => issue.id === 'cookies-without-secure'));
  assert.equal(JSON.stringify(result.evidence).includes('secret-value'), false);
});


test('mixed HTTP resources are detected in an HTTPS document with sanitized samples', () => {
  const result = buildSecurityAssessment(
    {
      'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
      'strict-transport-security': 'max-age=31536000',
      'x-content-type-options': 'nosniff',
    },
    'https://example.com/',
    '<html><script src="http://cdn.example.net/app.js?token=secret"></script><img src="http://cdn.example.net/pixel.png"></html>',
  );

  assert.equal(result.evidence.mixedContent.count, 2);
  assert.equal(result.evidence.mixedContent.activeCount, 1);
  assert.equal(result.evidence.mixedContent.samples[0].url.includes('token=secret'), false);
  const issue = result.category.issues.find((entry) => entry.id === 'mixed-content-observed');
  assert.equal(issue?.severity, 'critical');
});
