const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const organizationParamsSchema = z.object({
  organizationId: z.string().uuid(),
});
const checkoutBodySchema = z.object({
  plan: z.string().regex(/^[a-z0-9][a-z0-9._-]{1,79}$/),
});

router.get('/organizations/:organizationId/billing', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const { billingService } = getPersistenceServices();
    res.json({
      billing: await billingService.getStatus({
        organizationId: params.organizationId,
        userId: req.auth.userId,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'Billing Status');
  }
});

router.post('/organizations/:organizationId/billing/checkout-session', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const body = checkoutBodySchema.parse(req.body);
    const { billingService } = getPersistenceServices();
    const checkout = await billingService.createCheckout({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      email: req.auth.email,
      plan: body.plan,
    });
    res.status(201).json({ checkout });
  } catch (error) {
    sendRouteError(res, error, 'Billing Checkout');
  }
});

async function stripeWebhookHandler(req, res) {
  try {
    const { billingService } = getPersistenceServices();
    const result = await billingService.processStripeWebhook({
      rawBody: req.body,
      signatureHeader: req.get('stripe-signature'),
    });
    res.json({ received: true, ...result });
  } catch (error) {
    sendRouteError(res, error, 'Stripe Webhook');
  }
}

module.exports = {
  billingRoutes: router,
  stripeWebhookHandler,
};
