const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CONTRACT_VERSION,
  finalizeScanResponse,
} = require('../lib/scanContract');

test('finalizeScanResponse injects the shared contract version', () => {
  const result = finalizeScanResponse({
    url: 'https://example.com/',
    timestamp: new Date().toISOString(),
    type: 'web',
    overallScore: 67,
    categories: {
      security: {
        score: 67,
        totalChecks: 3,
        passedChecks: 2,
        status: 'warning',
        issues: [
          {
            id: 'missing-hsts',
            title: 'HSTS fehlt',
            description: 'Kein HSTS Header beobachtet.',
            severity: 'warning',
          },
        ],
      },
    },
  });

  assert.equal(result.contractVersion, CONTRACT_VERSION);
  assert.deepEqual(result.notices, []);
});

test('contract rejects passedChecks greater than totalChecks', () => {
  assert.throws(
    () => finalizeScanResponse({
      url: 'https://example.com/',
      timestamp: new Date().toISOString(),
      type: 'web',
      overallScore: 100,
      categories: {
        security: {
          score: 100,
          totalChecks: 1,
          passedChecks: 2,
          status: 'compliant',
          issues: [],
        },
      },
    }),
    /passedChecks cannot exceed totalChecks/i,
  );
});

test('contract rejects unsupported finding severity values', () => {
  assert.throws(() => finalizeScanResponse({
    url: 'https://example.com/',
    timestamp: new Date().toISOString(),
    type: 'web',
    overallScore: 40,
    categories: {
      security: {
        score: 40,
        totalChecks: 1,
        passedChecks: 0,
        status: 'critical',
        issues: [
          {
            id: 'bad-severity',
            title: 'Invalid',
            description: 'Invalid severity must not cross the API boundary.',
            severity: 'compliant',
          },
        ],
      },
    },
  }));
});
