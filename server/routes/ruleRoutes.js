const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getSecureProductPersistenceServices } = require('../services/secureProductPersistenceExtensions');

const router = express.Router();

const ruleIdSchema = z.string().regex(/^[a-z0-9][a-z0-9._-]{2,119}$/);
const ruleParamsSchema = z.object({ ruleId: ruleIdSchema });
const versionParamsSchema = z.object({
  ruleId: ruleIdSchema,
  version: z.coerce.number().int().positive().max(1_000_000),
});
const listQuerySchema = z.object({
  category: z.string().regex(/^[a-z0-9][a-z0-9._-]{1,79}$/).optional(),
  active: z.enum(['true', 'false']).optional(),
  limit: z.string().max(3).optional(),
});

router.get('/rules', requireAuth, async (req, res) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const { ruleService } = getSecureProductPersistenceServices();
    const rules = await ruleService.list({
      category: query.category,
      active: query.active === undefined ? true : query.active === 'true',
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
    const { ruleService } = getSecureProductPersistenceServices();
    const rule = await ruleService.get(params.ruleId);
    res.json({ rule });
  } catch (error) {
    sendRouteError(res, error, 'Rule Read');
  }
});

router.get('/rules/:ruleId/versions', requireAuth, async (req, res) => {
  try {
    const params = ruleParamsSchema.parse(req.params);
    const { ruleService } = getSecureProductPersistenceServices();
    res.json(await ruleService.versions(params.ruleId));
  } catch (error) {
    sendRouteError(res, error, 'Rule Versions');
  }
});

router.get('/rules/:ruleId/versions/:version', requireAuth, async (req, res) => {
  try {
    const params = versionParamsSchema.parse(req.params);
    const { ruleService } = getSecureProductPersistenceServices();
    res.json(await ruleService.version(params.ruleId, params.version));
  } catch (error) {
    sendRouteError(res, error, 'Rule Version Read');
  }
});

module.exports = { ruleRoutes: router };
