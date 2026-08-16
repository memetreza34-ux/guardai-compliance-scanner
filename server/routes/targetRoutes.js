const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const organizationParamsSchema = z.object({
  organizationId: z.string().uuid(),
});

const targetParamsSchema = z.object({
  organizationId: z.string().uuid(),
  targetId: z.string().uuid(),
});

const createWebsiteTargetSchema = z.object({
  type: z.literal('website').default('website'),
  url: z.string().min(1).max(2048),
  displayName: z.string().max(200).optional(),
});

router.get('/organizations/:organizationId/targets', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const { targetService } = getPersistenceServices();
    const targets = await targetService.list({
      organizationId: params.organizationId,
      userId: req.auth.userId,
    });

    res.json({ targets });
  } catch (error) {
    sendRouteError(res, error, 'Target List');
  }
});

router.get('/organizations/:organizationId/targets/:targetId', requireAuth, async (req, res) => {
  try {
    const params = targetParamsSchema.parse(req.params);
    const { targetService } = getPersistenceServices();
    const target = await targetService.get({
      organizationId: params.organizationId,
      targetId: params.targetId,
      userId: req.auth.userId,
    });

    res.json({ target });
  } catch (error) {
    sendRouteError(res, error, 'Target Read');
  }
});

router.post('/organizations/:organizationId/targets', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const body = createWebsiteTargetSchema.parse(req.body);
    const { targetService } = getPersistenceServices();
    const target = await targetService.createWebsite({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      url: body.url,
      displayName: body.displayName,
    });

    res.status(201).json({ target });
  } catch (error) {
    sendRouteError(res, error, 'Target Create');
  }
});

module.exports = { targetRoutes: router };
