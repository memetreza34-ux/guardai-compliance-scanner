const { config } = require('../config');
const { resolveStripePriceId } = require('../domain/billingConfig');
const { normalizeStripeSubscription } = require('../domain/billingState');
const { sha256Hex } = require('../lib/evidenceIntegrity');
const { HttpError } = require('../lib/httpError');

const ACTIVE_OR_RECOVERABLE_STATUSES = new Set([
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'paused',
]);

const RECONCILABLE_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]);

function stripeObjectId(value) {
  return typeof value === 'string' ? value : value?.id;
}

function subscriptionIdFromStripeEvent(event) {
  const object = event?.data?.object;
  if (!object || typeof object !== 'object') return null;

  if (event.type === 'checkout.session.completed') {
    return stripeObjectId(object.subscription) || null;
  }
  if (event.type.startsWith('customer.subscription.')) {
    return stripeObjectId(object.id) || null;
  }
  if (event.type.startsWith('invoice.')) {
    return (
      stripeObjectId(object.subscription) ||
      stripeObjectId(object.parent?.subscription_details?.subscription) ||
      null
    );
  }
  return null;
}

function providerCreatedAt(event) {
  if (!Number.isInteger(event?.created) || event.created <= 0) return null;
  return new Date(event.created * 1000).toISOString();
}

function createBillingService({
  billingRepository,
  organizationAuthorization,
  stripeProvider,
}) {
  if (!billingRepository) throw new TypeError('Billing service requires Billing repository.');
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Billing service requires Organization authorization.');
  }
  if (!stripeProvider) throw new TypeError('Billing service requires Stripe provider.');

  async function getStatus({ organizationId, userId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'admin');
    const subscription = await billingRepository.getSubscriptionForOrganization(organizationId);
    if (!subscription) {
      throw new HttpError(404, 'Organization subscription state was not found.', 'SUBSCRIPTION_NOT_FOUND');
    }
    return {
      provider: subscription.provider,
      plan: subscription.plan,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      periodEnd: subscription.periodEnd,
      billingEnabled: config.billingProvider === 'stripe',
    };
  }

  async function createCheckout({ organizationId, userId, email, plan }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'admin');
    stripeProvider.assertStripeConfigured();
    const priceId = resolveStripePriceId(config.stripePlanPriceMap, plan);

    let subscription = await billingRepository.getSubscriptionForOrganization(organizationId);
    if (!subscription) {
      throw new HttpError(404, 'Organization subscription state was not found.', 'SUBSCRIPTION_NOT_FOUND');
    }
    if (
      subscription.providerSubscriptionId &&
      ACTIVE_OR_RECOVERABLE_STATUSES.has(subscription.status)
    ) {
      throw new HttpError(
        409,
        'Organization already has a Stripe subscription that must be managed before starting another checkout.',
        'SUBSCRIPTION_ALREADY_EXISTS',
      );
    }

    let customerId = subscription.providerCustomerId;
    if (!customerId) {
      customerId = await stripeProvider.createCustomer({ organizationId, email });
      subscription = await billingRepository.attachStripeCustomer({ organizationId, customerId });
      customerId = subscription.providerCustomerId;
    }

    return stripeProvider.createSubscriptionCheckout({
      organizationId,
      plan,
      priceId,
      customerId,
    });
  }

  async function processStripeWebhook({ rawBody, signatureHeader }) {
    stripeProvider.assertStripeConfigured();
    const event = stripeProvider.constructWebhookEvent(rawBody, signatureHeader);
    if (typeof event?.id !== 'string' || typeof event?.type !== 'string') {
      throw new HttpError(400, 'Stripe webhook event is invalid.', 'BILLING_WEBHOOK_EVENT_INVALID');
    }

    const claim = await billingRepository.claimWebhookEvent({
      eventId: event.id,
      eventType: event.type,
      providerCreatedAt: providerCreatedAt(event),
      livemode: event.livemode === true,
      payloadHash: sha256Hex(rawBody),
    });

    if (!claim.claimed) {
      return {
        duplicate: true,
        final: claim.final,
        status: claim.status,
      };
    }

    try {
      if (!RECONCILABLE_EVENTS.has(event.type)) {
        await billingRepository.finalizeWebhookEvent({ eventId: event.id, status: 'ignored' });
        return { duplicate: false, ignored: true, status: 'ignored' };
      }

      const subscriptionId = subscriptionIdFromStripeEvent(event);
      if (!subscriptionId) {
        await billingRepository.finalizeWebhookEvent({ eventId: event.id, status: 'ignored' });
        return { duplicate: false, ignored: true, status: 'ignored' };
      }

      const stripeSubscription = await stripeProvider.retrieveSubscription(subscriptionId);
      const normalized = normalizeStripeSubscription(stripeSubscription, config.stripePlanPriceMap);
      const organizationId = await billingRepository.findOrganizationByStripeCustomer(
        normalized.providerCustomerId,
      );
      if (!organizationId) {
        throw new HttpError(
          409,
          'Stripe Customer is not linked to a GuardAI Organization.',
          'BILLING_CUSTOMER_NOT_LINKED',
        );
      }

      const subscription = await billingRepository.reconcileStripeSubscription({
        organizationId,
        normalizedSubscription: normalized,
      });
      await billingRepository.finalizeWebhookEvent({
        eventId: event.id,
        status: 'processed',
        organizationId,
      });

      return {
        duplicate: false,
        ignored: false,
        status: 'processed',
        organizationId,
        plan: subscription.plan,
        subscriptionStatus: subscription.status,
      };
    } catch (error) {
      await billingRepository.finalizeWebhookEvent({
        eventId: event.id,
        status: 'failed',
        error,
      });
      throw error;
    }
  }

  return {
    createCheckout,
    getStatus,
    processStripeWebhook,
  };
}

module.exports = {
  ACTIVE_OR_RECOVERABLE_STATUSES,
  createBillingService,
  providerCreatedAt,
  RECONCILABLE_EVENTS,
  subscriptionIdFromStripeEvent,
};
