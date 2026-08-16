const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { verificationLimiter } = require('../middleware/verificationLimiter');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const paramsSchema = z.object({
  organizationId: z.string().uuid(),
  targetId: z.string().uuid(),
});

router.post(
  '/organizations/:organizationId/targets/:targetId/verification-challenges',
  requireAuth,
  verificationLimiter,
  async (req, res) => {
    try {
      const params = paramsSchema.parse(req.params);
      const { targetVerificationService } = getPersistenceServices();
      const challenge = await targetVerificationService.startDnsChallenge({
        organizationId: params.organizationId,
        targetId: params.targetId,
        userId: req.auth.userId,
      });

      res.status(201).json({ challenge });
    } catch (error) {
      sendRouteError(res, error, 'Target Verification Challenge');
    }
  },
);

router.post(
  '/organizations/:organizationId/targets/:targetId/verification-challenges/check',
  requireAuth,
  verificationLimiter,
  async (req, res) => {
    try {
      const params = paramsSchema.parse(req.params);
      const { targetVerificationService } = getPersistenceServices();
      const verification = await targetVerificationService.checkDnsChallenge({
        organizationId: params.organizationId,
        targetId: params.targetId,
        userId: req.auth.userId,
      });

      res.json({ verification });
    } catch (error) {
      sendRouteError(res, error, 'Target Verification Check');
    }
  },
);

module.exports = { targetVerificationRoutes: router };
