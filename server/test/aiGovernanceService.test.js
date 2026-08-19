const test = require('node:test');
const assert = require('node:assert/strict');
const { createAiGovernanceService } = require('../services/aiGovernanceService');

function systemProfile() {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    organizationId: '11111111-1111-4111-8111-111111111111',
    systemName: 'Support Assistant',
    organizationRole: 'deployer',
    providerName: 'Example Provider',
    modelName: 'Example Model',
    deploymentContext: 'customer-facing',
    useCases: ['human-interaction', 'content-generation'],
    declarations: {
      interactsDirectlyWithPeople: 'yes',
      generatesSyntheticContent: 'yes',
      aiLiteracyMeasuresDocumented: 'yes',
      humanOversightControlsDocumented: 'unknown',
      interactionDisclosureDocumented: 'no',
      syntheticContentDisclosureDocumented: 'unknown',
    },
    archivedAt: null,
  };
}

function createHarness() {
  const roleCalls = [];
  let reviewInput = null;
  let transitionInput = null;
  const organizationAuthorization = {
    async requireRole(organizationId, userId, role) {
      roleCalls.push({ organizationId, userId, role });
      return { organizationId, userId, role };
    },
  };
  const aiGovernanceRepository = {
    async getSystemProfile() {
      return systemProfile();
    },
    async createReviewWithItems(input) {
      reviewInput = input;
      return { id: '33333333-3333-4333-8333-333333333333', status: 'draft' };
    },
    async transitionReview(input) {
      transitionInput = input;
      return { id: input.reviewId, status: input.action === 'review' ? 'reviewed' : input.action };
    },
    async createSystemProfile(input) {
      return { ...systemProfile(), createdBy: input.createdBy };
    },
    async updateSystemProfile() {
      return systemProfile();
    },
    async archiveSystemProfile() {
      return { ...systemProfile(), archivedAt: new Date().toISOString() };
    },
    async listSystemProfiles() {
      return [systemProfile()];
    },
    async listReviews() {
      return [];
    },
    async getReview() {
      return { id: '33333333-3333-4333-8333-333333333333', status: 'draft' };
    },
  };
  return {
    service: createAiGovernanceService({ organizationAuthorization, aiGovernanceRepository }),
    roleCalls,
    getReviewInput: () => reviewInput,
    getTransitionInput: () => transitionInput,
  };
}

test('review creation derives legal-source provenance internally', async () => {
  const harness = createHarness();
  await harness.service.createReview({
    organizationId: '11111111-1111-4111-8111-111111111111',
    userId: '44444444-4444-4444-8444-444444444444',
    systemId: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(harness.roleCalls[0].role, 'member');
  const persisted = harness.getReviewInput();
  assert.equal(persisted.sourceRegistryId, 'eu-ai-act-guided-review');
  assert.equal(persisted.sourceRegistryVersion, 1);
  assert.equal(persisted.reviewItems.length, 4);
  assert.deepEqual(
    [...new Set(persisted.reviewItems.map((item) => item.legalSourceId))].sort(),
    [
      'a1000000-0000-4000-8000-000000000004',
      'a1000000-0000-4000-8000-000000000014',
      'a1000000-0000-4000-8000-000000000050',
    ],
  );
  assert.ok(persisted.reviewItems.every((item) => item.applicabilityState === undefined));
});

test('marking a review as reviewed requires admin authorization', async () => {
  const harness = createHarness();
  await harness.service.markReviewed({
    organizationId: '11111111-1111-4111-8111-111111111111',
    userId: '44444444-4444-4444-8444-444444444444',
    reviewId: '33333333-3333-4333-8333-333333333333',
  });

  assert.equal(harness.roleCalls[0].role, 'admin');
  assert.deepEqual(harness.getTransitionInput(), {
    organizationId: '11111111-1111-4111-8111-111111111111',
    reviewId: '33333333-3333-4333-8333-333333333333',
    action: 'review',
    actorId: '44444444-4444-4444-8444-444444444444',
  });
});

test('archived AI Systems cannot create new guided reviews', async () => {
  const harness = createHarness();
  harness.service = createAiGovernanceService({
    organizationAuthorization: {
      async requireRole() {},
    },
    aiGovernanceRepository: {
      async getSystemProfile() {
        return { ...systemProfile(), archivedAt: new Date().toISOString() };
      },
    },
  });

  await assert.rejects(
    () => harness.service.createReview({
      organizationId: '11111111-1111-4111-8111-111111111111',
      userId: '44444444-4444-4444-8444-444444444444',
      systemId: '22222222-2222-4222-8222-222222222222',
    }),
    (error) => error.code === 'AI_SYSTEM_NOT_FOUND' && error.statusCode === 404,
  );
});
