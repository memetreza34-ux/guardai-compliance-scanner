const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPrivacyBrowserEvidence,
  normalizeRequestSummary,
} = require('../scanners/privacyBrowserEvidence');

test('privacy browser Evidence strips request queries, cookie values, storage values and control labels', () => {
  const requestSecret = 'request-secret-123';
  const cookieSecret = 'cookie-secret-456';
  const storageSecret = 'storage-secret-789';
  const controlSecret = 'control-secret-000';

  const evidence = buildPrivacyBrowserEvidence({
    finalUrl: 'https://example.com/account?session=final-secret#profile',
    initial: {
      requests: [
        {
          url: `https://example.com/api/user?token=${requestSecret}`,
          resourceType: 'fetch',
        },
        {
          url: `https://cdn.example.net/script.js?identifier=${requestSecret}`,
          resourceType: 'script',
        },
      ],
      cookies: [
        {
          name: 'session',
          value: cookieSecret,
          domain: '.example.com',
          secure: true,
          httpOnly: true,
          sameSite: 'Lax',
        },
      ],
      storage: {
        localStorageEntryCount: 2,
        sessionStorageEntryCount: 1,
        localStorage: { secret: storageSecret },
      },
    },
    consentBannerDetected: true,
    consentControls: [
      { kind: 'reject', label: `Reject ${controlSecret}` },
      { kind: 'accept', label: 'Accept all' },
    ],
    rejectAction: { attempted: true, completed: true },
    privacyLinks: [
      { href: 'https://example.com/privacy?user=private-value#section' },
    ],
  });

  const serialized = JSON.stringify(evidence);
  assert.equal(serialized.includes(requestSecret), false);
  assert.equal(serialized.includes(cookieSecret), false);
  assert.equal(serialized.includes(storageSecret), false);
  assert.equal(serialized.includes(controlSecret), false);
  assert.equal(serialized.includes('final-secret'), false);
  assert.equal(serialized.includes('private-value'), false);

  assert.equal(evidence.source, 'https://example.com');
  assert.equal(evidence.normalizedData.page.finalPath, '/account');
  assert.deepEqual(evidence.normalizedData.initial.network.crossOriginOrigins, ['https://cdn.example.net']);
  assert.deepEqual(evidence.normalizedData.consent.controls, [{ kind: 'reject' }, { kind: 'accept' }]);
  assert.equal(evidence.normalizedData.initial.cookies.totalCount, 1);
  assert.equal(evidence.normalizedData.initial.storage.localStorageEntryCount, 2);
  assert.equal(evidence.normalizedData.privacyLinks[0].urlWithoutQuery, 'https://example.com/privacy');
});

test('cross-origin requests remain technical origin observations, not tracker classifications', () => {
  const summary = normalizeRequestSummary([
    { url: 'https://example.com/app.js', resourceType: 'script' },
    { url: 'https://metrics.example.net/collect?id=abc', resourceType: 'fetch' },
    { url: 'https://metrics.example.net/pixel?id=def', resourceType: 'image' },
  ], 'https://example.com');

  assert.equal(summary.totalCount, 3);
  assert.equal(summary.sameOriginCount, 1);
  assert.equal(summary.crossOriginCount, 2);
  assert.deepEqual(summary.crossOriginOrigins, ['https://metrics.example.net']);
  assert.equal(Object.prototype.hasOwnProperty.call(summary, 'trackerCount'), false);
});

test('privacy observation limits fail closed instead of truncating raw request population silently', () => {
  const requests = Array.from({ length: 5001 }, (_, index) => ({
    url: `https://example.com/${index}`,
    resourceType: 'fetch',
  }));
  assert.throws(
    () => normalizeRequestSummary(requests, 'https://example.com'),
    (error) => error.code === 'PRIVACY_BROWSER_OBSERVATION_LIMIT' && error.statusCode === 422,
  );
});
