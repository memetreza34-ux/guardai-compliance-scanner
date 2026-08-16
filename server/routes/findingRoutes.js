const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const organizationParamsSchema = z.object({
  organizationId: z.string().uuid(),
});
const findingParamsSchema = z.object({
  organizationId: z.string().uuid(),
  findingId: z.string().uuid(),
});
const listQuerySchema = z.object({
  status: z.enum(['open', 'resolved', 'accepted_risk']).optional(),
  targetId: z.string().uuid().optional(),
  limit: z.string().max(3).optional(),
  cursor: z.string().max(500).optional(),
});
const historyQuerySchema = z.object({
  limit: z.string().max(3).optional(),
  cursor: z.string().max(500).optional(),
});
const statusBodySchema = z.object({
  status: z.enum(['open', 'resolved', 'accepted_risk']),
  reason: z.string().max(2000).optional().nullable(),
});

router.get('/organizations/:organizationId/findings', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const query = listQuerySchema.parse(req.query);
    const { findingService } = getPersistenceServices();
    const page = await findingService.list({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      status: query.status,
      targetId: query.targetId,
      limit: query.limit,
      cursor: query.cursor,
    });
    res.json(page);
  } catch (error) {
    sendRouteError(res, error, 'Finding List');
  }
});

router.get('/organizations/:organizationId/findings/:findingId', requireAuth, async (req, res) => {
  try {
    const params = findingParamsSchema.parse(req.params);
    const { findingService } = getPersistenceServices();
    const finding = await findingService.get({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      findingId: params.findingId,
    });
    res.json({ finding });
  } catch (error) {
    sendRouteError(res, error, 'Finding Read');
  }
});

router.patch('/organizations/:organizationId/findings/:findingId/status', requireAuth, async (req, res) => {
  try {
    const params = findingParamsSchema.parse(req.params);
    const body = statusBodySchema.parse(req.body);
    const { findingService } = getPersistenceServices();
    const finding = await findingService.updateStatus({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      findingId: params.findingId,
      status: body.status,
      reason: body.reason,
    });
    res.json({ finding });
  } catch (error) {
    sendRouteError(res, error, 'Finding Status Update');
  }
});

router.get('/organizations/:organizationId/findings/:findingId/history', requireAuth, async (req, res) => {
  try {
    const params = findingParamsSchema.parse(req.params);
    const query = historyQuerySchema.parse(req.query);
    const { findingService } = getPersistenceServices();
    const page = await findingService.history({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      findingId: params.findingId,
      limit: query.limit,
      cursor: query.cursor,
    });
    res.json(page);
  } catch (error) {
    sendRouteError(res, error, 'Finding History');
  }
});

module.exports = { findingRoutes: router };
