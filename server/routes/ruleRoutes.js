const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const ruleIdSchema = z.string().regex(/^[a-z0-9][a-z0-9._-]{2,119}$/);
const ruleParamsSchema = z.object({ ruleId: ruleIdSchema });
const versionParamsSchema = z.object({
  ruleId: ruleIdSchema,
  version: z.coerce.number().int().positive().max(1_000_000),
});
const listQuerySchema = z.object({
  framework: z.string().max(120).optional(),
  status: z.enum(['active', 'deprecated', 'draft']).optional(),
  limit: z.string().max(3).optional(),
});

router.get('/rules', requireAuth, async (req, res) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { ruleService } = getPersistenceServices();
    const rules = await ruleService.list({
      framework: query.framework,
      status: query.status,
      limit: query.limit,
    });
    res.json({ rules });
  } catch (error) {
    sendRouteError(res, error, 'Rule Catalog');
  }
});

router.get('/rules/:ruleId', requireAuth, async (req, res) => {
  try {
    const params = ruleParamsSchema.parse(req.params);
    const { ruleService } = getPersistenceServices();
    const rule = await ruleService.get(params.ruleId);
    res.json({ rule });
  } catch (error) {
    sendRouteError(res, error, 'Rule Read');
  }
});

router.get('/rules/:ruleId/versions', requireAuth, async (req, res) => {
  try {
    const params = ruleParamsSchema.parse(req.params);
    const { ruleService } = getPersistenceServices();
    res.json(await ruleService.versions(params.ruleId));
  } catch (error) {
    sendRouteError(res, error, 'Rule Versions');
  }
});

router.get('/rules/:ruleId/versions/:version', requireAuth, async (req, res) => {
  try {
    const params = versionParamsSchema.parse(req.params);
    const { ruleService } = getPersistenceServices();
    res.json(await ruleService.version(params.ruleId, params.version));
  } catch (error) {
    sendRouteError(res, error, 'Rule Version Read');
  }
});

module.exports = { ruleRoutes: router };
