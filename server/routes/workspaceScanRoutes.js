const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const paramsSchema = z.object({
  organizationId: z.string().uuid(),
  targetId: z.string().uuid(),
});

const bodySchema = z.object({
  modules: z.array(z.string()).min(1).max(6),
});

router.post(
  '/organizations/:organizationId/targets/:targetId/scans',
  requireAuth,
  async (req, res) => {
    try {
      const params = paramsSchema.parse(req.params);
      const body = bodySchema.parse(req.body);
      const idempotencyHeader = req.get('Idempotency-Key');
      const { scanSubmission } = getPersistenceServices();

      const result = await scanSubmission.submit({
        organizationId: params.organizationId,
        targetId: params.targetId,
        requestedBy: req.auth.userId,
        requestedModules: body.modules,
        idempotencyKey: idempotencyHeader || null,
      });

      res.status(result.created ? 202 : 200).json({
        scan: result.scan,
        jobs: result.jobs,
        idempotentReplay: !result.created,
      });
    } catch (error) {
      sendRouteError(res, error, 'Workspace Scan Submission');
    }
  },
);

module.exports = { workspaceScanRoutes: router };
