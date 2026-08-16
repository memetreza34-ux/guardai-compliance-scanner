const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const paramsSchema = z.object({
  organizationId: z.string().uuid(),
});

const querySchema = z.object({
  limit: z.string().max(3).optional(),
  cursor: z.string().max(500).optional(),
});

router.get('/organizations/:organizationId/audit-events', requireAuth, async (req, res) => {
  try {
    const params = paramsSchema.parse(req.params);
    const query = querySchema.parse(req.query);
    const { auditService } = getPersistenceServices();
    const page = await auditService.list({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      limit: query.limit,
      cursor: query.cursor,
    });

    res.json(page);
  } catch (error) {
    sendRouteError(res, error, 'Audit History');
  }
});

module.exports = { auditRoutes: router };
