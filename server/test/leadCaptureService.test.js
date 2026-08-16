const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createLeadCaptureService,
  resolveLeadCapturePolicy,
} = require('../services/leadCaptureService');

function runtimeConfig(overrides = {}) {
  return {
    leadCaptureEnabled: true,
    leadPrivacyNoticeVersion: 'privacy-2026-08-16',
    leadRetentionDays: 30,
    publicAppUrl: 'https://guardai.example',
    ...overrides,
  };
}

function createHarness(overrides = {}) {
  const calls = [];
  const leadRepository = {
    async createLead(input) {
      calls.push(input);
      return {
        created: true,
        receipt: {
          id: 'lead-internal-id',
          status: 'received',
          marketingConsentStatus: 'not_requested',
          contactRequestedAt: '2026-08-16T18:00:00.000Z',
          retentionExpiresAt: input.retentionExpiresAt,
        },
      };
    },
  };
  return {
    calls,
    service: createLeadCaptureService({
      leadRepository,
      runtimeConfig: runtimeConfig(overrides),
    }),
  };
}

test('public policy stays disabled unless flag, privacy version and retention are all valid', () => {
  assert.equal(resolveLeadCapturePolicy(runtimeConfig()).enabled, true);
  assert.equal(resolveLeadCapturePolicy(runtimeConfig({ leadCaptureEnabled: false })).enabled, false);
  assert.equal(resolveLeadCapturePolicy(runtimeConfig({ leadPrivacyNoticeVersion: '' })).enabled, false);
  assert.equal(resolveLeadCapturePolicy(runtimeConfig({ leadRetentionDays: 0 })).enabled, false);
  assert.equal(resolveLeadCapturePolicy(runtimeConfig()).marketingOptInAvailable, false);
});

test('disabled Lead Capture rejects submission without repository write', async () => {
  const { calls, service } = createHarness({ leadCaptureEnabled: false });
  await assert.rejects(
    () => service.submit({
      idempotencyKey: 'lead-request-123',
      input: { email: 'user@example.com' },
    }),
    (error) => error.code === 'LEAD_CAPTURE_NOT_CONFIGURED' && error.statusCode === 503,
  );
  assert.equal(calls.length, 0);
});

test('honeypot returns generic accepted receipt without persistence', async () => {
  const { calls, service } = createHarness();
  const result = await service.submit({
    idempotencyKey: 'lead-request-123',
    input: {
      email: 'bot@example.com',
      website: 'https://spam.example',
    },
  });
  assert.deepEqual(result, {
    accepted: true,
    idempotentReplay: false,
    marketingConfirmationRequired: false,
  });
  assert.equal(calls.length, 0);
});

test('marketing opt-in is rejected until true Double-Opt-In delivery exists', async () => {
  const { calls, service } = createHarness();
  await assert.rejects(
    () => service.submit({
      idempotencyKey: 'lead-request-123',
      input: { email: 'user@example.com', marketingOptIn: true },
    }),
    (error) => error.code === 'MARKETING_OPT_IN_NOT_AVAILABLE' && error.statusCode === 422,
  );
  assert.equal(calls.length, 0);
});

test('accepted contact lead persists purpose/privacy/retention but public receipt contains no PII or ID', async () => {
  const { calls, service } = createHarness();
  const result = await service.submit({
    idempotencyKey: 'lead-request-123',
    input: {
      email: 'User@Example.com',
      name: 'Ada',
      company: 'Example GmbH',
      message: 'Bitte kontaktieren.',
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].email, 'user@example.com');
  assert.equal(calls[0].privacyNoticeVersion, 'privacy-2026-08-16');
  assert.equal(calls[0].source, 'website_contact');
  assert.match(calls[0].submissionFingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(result, {
    accepted: true,
    idempotentReplay: false,
    marketingConfirmationRequired: false,
  });
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'email'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'id'), false);
});
