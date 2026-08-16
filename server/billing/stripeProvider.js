const { config } = require('../config');
const { checkoutExpiryEpochSeconds } = require('../domain/billingCheckout');
const { HttpError } = require('../lib/httpError');

let stripeClient = null;

function assertStripeConfigured() {
  if (config.billingProvider !== 'stripe') {
    throw new HttpError(503, 'GuardAI billing is not enabled.', 'BILLING_NOT_ENABLED');
  }
  if (!config.stripeSecretKey || !config.stripeWebhookSecret) {
    throw new HttpError(503, 'GuardAI Stripe billing is not configured.', 'BILLING_NOT_CONFIGURED');
  }
}

function getStripeClient() {
  assertStripeConfigured();
  if (!stripeClient) {
    // Lazy loading keeps non-billing development paths loadable until a clean install
    // has regenerated and verified the backend lockfile with the Stripe SDK.
    const Stripe = require('stripe');
    stripeClient = new Stripe(config.stripeSecretKey, {
      maxNetworkRetries: 2,
      timeout: 10000,
      appInfo: {
        name: 'GuardAI',
        version: '0.1.0',
      },
    });
  }
  return stripeClient;
}

function normalizeStripeId(value, prefix, field) {
  if (typeof value !== 'string' || !value.startsWith(`${prefix}_`) || value.length > 255) {
    throw new HttpError(502, `Stripe returned an invalid ${field}.`, 'BILLING_PROVIDER_RESPONSE_INVALID');
  }
  return value;
}

function normalizeCheckoutUrl(value) {
  if (typeof value !== 'string') {
    throw new HttpError(502, 'Stripe Checkout did not return a URL.', 'BILLING_PROVIDER_RESPONSE_INVALID');
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new HttpError(502, 'Stripe Checkout returned an invalid URL.', 'BILLING_PROVIDER_RESPONSE_INVALID');
  }
  if (parsed.protocol !== 'https:') {
    throw new HttpError(502, 'Stripe Checkout returned a non-HTTPS URL.', 'BILLING_PROVIDER_RESPONSE_INVALID');
  }
  return parsed.toString();
}

function normalizeCheckoutExpiry(value) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new HttpError(502, 'Stripe Checkout returned an invalid expiration.', 'BILLING_PROVIDER_RESPONSE_INVALID');
  }
  return new Date(value * 1000).toISOString();
}

async function createCustomer({ organizationId, email, idempotencyKey }) {
  const stripe = getStripeClient();
  const customer = await stripe.customers.create(
    {
      email: email || undefined,
      metadata: {
        guardaiOrganizationId: organizationId,
      },
    },
    { idempotencyKey },
  );
  return normalizeStripeId(customer.id, 'cus', 'Customer ID');
}

async function createSubscriptionCheckout({
  organizationId,
  plan,
  priceId,
  customerId,
  idempotencyKey,
}) {
  const stripe = getStripeClient();
  const successUrl = new URL('/billing/return?checkout=success', config.publicAppUrl).toString();
  const cancelUrl = new URL('/billing/return?checkout=cancelled', config.publicAppUrl).toString();
  const expiresAt = checkoutExpiryEpochSeconds();
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      customer: customerId,
      client_reference_id: organizationId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: expiresAt,
      allow_promotion_codes: false,
      metadata: {
        guardaiOrganizationId: organizationId,
        guardaiPlan: plan,
      },
      subscription_data: {
        metadata: {
          guardaiOrganizationId: organizationId,
          guardaiPlan: plan,
        },
      },
    },
    { idempotencyKey },
  );

  return {
    sessionId: normalizeStripeId(session.id, 'cs', 'Checkout Session ID'),
    url: normalizeCheckoutUrl(session.url),
    expiresAt: normalizeCheckoutExpiry(session.expires_at),
  };
}

async function retrieveCheckoutSession(sessionId) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(
    normalizeStripeId(sessionId, 'cs', 'Checkout Session ID'),
  );
  return {
    sessionId: normalizeStripeId(session.id, 'cs', 'Checkout Session ID'),
    url: normalizeCheckoutUrl(session.url),
    expiresAt: normalizeCheckoutExpiry(session.expires_at),
    status: session.status,
  };
}

function constructWebhookEvent(rawBody, signatureHeader) {
  const stripe = getStripeClient();
  if (!Buffer.isBuffer(rawBody)) {
    throw new HttpError(400, 'Stripe webhook body must be raw bytes.', 'BILLING_WEBHOOK_BODY_INVALID');
  }
  if (typeof signatureHeader !== 'string' || signatureHeader.length === 0) {
    throw new HttpError(400, 'Stripe webhook signature is missing.', 'BILLING_WEBHOOK_SIGNATURE_MISSING');
  }

  try {
    return stripe.webhooks.constructEvent(rawBody, signatureHeader, config.stripeWebhookSecret);
  } catch {
    throw new HttpError(400, 'Stripe webhook signature is invalid.', 'BILLING_WEBHOOK_SIGNATURE_INVALID');
  }
}

async function retrieveSubscription(subscriptionId) {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(
    normalizeStripeId(subscriptionId, 'sub', 'Subscription ID'),
    { expand: ['items.data.price'] },
  );
}

module.exports = {
  assertStripeConfigured,
  constructWebhookEvent,
  createCustomer,
  createSubscriptionCheckout,
  getStripeClient,
  normalizeCheckoutExpiry,
  normalizeCheckoutUrl,
  normalizeStripeId,
  retrieveCheckoutSession,
  retrieveSubscription,
};
