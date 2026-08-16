const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const organizationParamsSchema = z.object({
  organizationId: z.string().uuid(),
});
const evidenceParamsSchema = z.object({
  organizationId: z.string().uuid(),
  evidenceId: z.string().uuid(),
});
const listQuerySchema = z.object({
  targetId: z.string().uuid().optional(),
  scanId: z.string().uuid().optional(),
  detectorId: z.string().max(120).optional(),
  type: z.string().max(120).optional(),
  limit: z.string().max(3).optional(),
  cursor: z.string().max(500).optional(),
});

router.get('/organizations/:organizationId/evidence', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const query = listQuerySchema.parse(req.query);
    const { evidenceService } = getPersistenceServices();
    const page = await evidenceService.list({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      targetId: query.targetId,
      scanId: query.scanId,
      detectorId: query.detectorId,
      type: query.type,
      limit: query.limit,
      cursor: query.cursor,
    });
    res.json(page);
  } catch (error) {
    sendRouteError(res, error, 'Evidence List');
  }
});

router.get('/organizations/:organizationId/evidence/:evidenceId', requireAuth, async (req, res) => {
  try {
    const params = evidenceParamsSchema.parse(req.params);
    const { evidenceService } = getPersistenceServices();
    const evidence = await evidenceService.get({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      evidenceId: params.evidenceId,
    });
    res.json({ evidence });
  } catch (error) {
    sendRouteError(res, error, 'Evidence Read');
  }
});

module.exports = { evidenceRoutes: router };
