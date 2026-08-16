const test = require('node:test');
const assert = require('node:assert/strict');
const { createBillingService, subscriptionIdFromStripeEvent } = require('../services/billingService');

const runtimeConfig = {
  billingProvider: 'stripe',
  stripePlanPriceMap: Object.freeze({ pro: 'price_Pro123' }),
};

function createHarness({ duplicate = false } = {}) {
  const calls = [];
  let subscription = {
    organizationId: 'org-a',
    provider: 'internal',
    providerCustomerId: null,
    providerSubscriptionId: null,
    providerPriceId: null,
    plan: 'free',
    status: 'active',
    cancelAtPeriodEnd: false,
    periodEnd: null,
  };

  const organizationAuthorization = {
    async requireRole(organizationId, userId, role) {
      calls.push(['role', organizationId, userId, role]);
    },
  };
  const billingRepository = {
    async getSubscriptionForOrganization() {
      return subscription;
    },
    async attachStripeCustomer({ customerId }) {
      subscription = { ...subscription, provider: 'stripe', providerCustomerId: customerId };
      calls.push(['attachCustomer', customerId]);
      return subscription;
    },
    async claimWebhookEvent(input) {
      calls.push(['claim', input]);
      return duplicate
        ? { claimed: false, final: true, status: 'processed' }
        : { claimed: true, final: false, status: 'processing' };
    },
    async findOrganizationByStripeCustomer(customerId) {
      calls.push(['findOrganization', customerId]);
      return customerId === 'cus_Test123' ? 'org-a' : null;
    },
    async reconcileStripeSubscription({ normalizedSubscription }) {
      subscription = {
        ...subscription,
        ...normalizedSubscription,
        organizationId: 'org-a',
      };
      calls.push(['reconcile', normalizedSubscription]);
      return subscription;
    },
    async finalizeWebhookEvent(input) {
      calls.push(['finalize', input]);
    },
  };
  const stripeProvider = {
    assertStripeConfigured() {
      calls.push(['stripeConfigured']);
    },
    async createCustomer({ organizationId, email }) {
      calls.push(['createCustomer', organizationId, email]);
      return 'cus_Test123';
    },
    async createSubscriptionCheckout(input) {
      calls.push(['checkout', input]);
      return { sessionId: 'cs_Test123', url: 'https://checkout.stripe.com/test' };
    },
    constructWebhookEvent() {
      return {
        id: 'evt_Test123',
        type: 'customer.subscription.updated',
        created: 1800000000,
        livemode: false,
        data: { object: { id: 'sub_Test123' } },
      };
    },
    async retrieveSubscription() {
      return {
        id: 'sub_Test123',
        customer: 'cus_Test123',
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: 1800003600,
        items: { data: [{ price: { id: 'price_Pro123' } }] },
      };
    },
  };

  return {
    calls,
    service: createBillingService({
      billingRepository,
      organizationAuthorization,
      stripeProvider,
      runtimeConfig,
    }),
  };
}

test('checkout requires admin and resolves configured Price server-side', async () => {
  const { calls, service } = createHarness();
  const result = await service.createCheckout({
    organizationId: 'org-a',
    userId: 'user-a',
    email: 'user@example.com',
    plan: 'pro',
  });
  assert.equal(result.sessionId, 'cs_Test123');
  assert.deepEqual(calls[0], ['role', 'org-a', 'user-a', 'admin']);
  const checkout = calls.find((entry) => entry[0] === 'checkout');
  assert.equal(checkout[1].priceId, 'price_Pro123');
  assert.equal(checkout[1].customerId, 'cus_Test123');
});

test('verified webhook reconciles current Stripe Subscription and finalizes event', async () => {
  const { calls, service } = createHarness();
  const result = await service.processStripeWebhook({
    rawBody: Buffer.from('{"id":"evt_Test123"}'),
    signatureHeader: 't=1,v1=test',
  });
  assert.equal(result.status, 'processed');
  assert.equal(result.plan, 'pro');
  assert.equal(result.subscriptionStatus, 'active');
  assert.ok(calls.some((entry) => entry[0] === 'reconcile'));
  assert.ok(calls.some((entry) => entry[0] === 'finalize' && entry[1].status === 'processed'));
});

test('duplicate finalized webhook has no provider or entitlement side effect', async () => {
  const { calls, service } = createHarness({ duplicate: true });
  const result = await service.processStripeWebhook({
    rawBody: Buffer.from('{"id":"evt_Test123"}'),
    signatureHeader: 't=1,v1=test',
  });
  assert.equal(result.duplicate, true);
  assert.equal(calls.some((entry) => entry[0] === 'reconcile'), false);
});

test('subscription ID extraction supports checkout, subscription and modern invoice parent shape', () => {
  assert.equal(subscriptionIdFromStripeEvent({
    type: 'checkout.session.completed',
    data: { object: { subscription: 'sub_A' } },
  }), 'sub_A');
  assert.equal(subscriptionIdFromStripeEvent({
    type: 'customer.subscription.updated',
    data: { object: { id: 'sub_B' } },
  }), 'sub_B');
  assert.equal(subscriptionIdFromStripeEvent({
    type: 'invoice.paid',
    data: { object: { parent: { subscription_details: { subscription: 'sub_C' } } } },
  }), 'sub_C');
});
