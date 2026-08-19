const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const organizationParamsSchema = z.object({ organizationId: z.string().uuid() });
const systemParamsSchema = z.object({
  organizationId: z.string().uuid(),
  systemId: z.string().uuid(),
});
const reviewParamsSchema = z.object({
  organizationId: z.string().uuid(),
  reviewId: z.string().uuid(),
});

const triState = z.enum(['yes', 'no', 'unknown']);
const declarationSchema = z.object({
  systemName: z.string().trim().min(1).max(160),
  organizationRole: z.enum(['provider', 'deployer', 'both', 'unknown']).default('unknown'),
  providerName: z.string().trim().min(1).max(160).nullable().optional(),
  modelName: z.string().trim().min(1).max(160).nullable().optional(),
  deploymentContext: z.enum(['internal', 'customer-facing', 'embedded', 'other', 'unknown']).default('unknown'),
  useCases: z.array(z.enum([
    'content-generation',
    'human-interaction',
    'decision-support',
    'automated-action',
    'biometric-or-emotion',
    'other',
  ])).max(10).default([]),
  declarations: z.object({
    interactsDirectlyWithPeople: triState.default('unknown'),
    generatesSyntheticContent: triState.default('unknown'),
    aiLiteracyMeasuresDocumented: triState.default('unknown'),
    humanOversightControlsDocumented: triState.default('unknown'),
    interactionDisclosureDocumented: triState.default('unknown'),
    syntheticContentDisclosureDocumented: triState.default('unknown'),
  }).strict(),
}).strict();

const listSystemsQuerySchema = z.object({
  includeArchived: z.enum(['true', 'false']).optional().transform((value) => value === 'true'),
}).strict();
const listReviewsQuerySchema = z.object({
  systemId: z.string().uuid().optional(),
}).strict();
const emptyBodySchema = z.object({}).strict();

function service() {
  return getPersistenceServices().aiGovernanceService;
}

router.get('/organizations/:organizationId/ai-systems', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const query = listSystemsQuerySchema.parse(req.query);
    res.json({
      systems: await service().listSystems({
        organizationId: params.organizationId,
        userId: req.auth.userId,
        includeArchived: query.includeArchived,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'AI Governance System List');
  }
});

router.post('/organizations/:organizationId/ai-systems', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const declaration = declarationSchema.parse(req.body);
    const system = await service().createSystem({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      declaration,
    });
    res.status(201).json({ system });
  } catch (error) {
    sendRouteError(res, error, 'AI Governance System Create');
  }
});

router.get('/organizations/:organizationId/ai-systems/:systemId', requireAuth, async (req, res) => {
  try {
    const params = systemParamsSchema.parse(req.params);
    res.json({
      system: await service().getSystem({
        organizationId: params.organizationId,
        userId: req.auth.userId,
        systemId: params.systemId,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'AI Governance System Get');
  }
});

router.put('/organizations/:organizationId/ai-systems/:systemId', requireAuth, async (req, res) => {
  try {
    const params = systemParamsSchema.parse(req.params);
    const declaration = declarationSchema.parse(req.body);
    res.json({
      system: await service().updateSystem({
        organizationId: params.organizationId,
        userId: req.auth.userId,
        systemId: params.systemId,
        declaration,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'AI Governance System Update');
  }
});

router.post('/organizations/:organizationId/ai-systems/:systemId/archive', requireAuth, async (req, res) => {
  try {
    const params = systemParamsSchema.parse(req.params);
    emptyBodySchema.parse(req.body || {});
    res.json({
      system: await service().archiveSystem({
        organizationId: params.organizationId,
        userId: req.auth.userId,
        systemId: params.systemId,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'AI Governance System Archive');
  }
});

router.post('/organizations/:organizationId/ai-systems/:systemId/reviews', requireAuth, async (req, res) => {
  try {
    const params = systemParamsSchema.parse(req.params);
    emptyBodySchema.parse(req.body || {});
    const review = await service().createReview({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      systemId: params.systemId,
    });
    res.status(201).json({ review });
  } catch (error) {
    sendRouteError(res, error, 'AI Governance Review Create');
  }
});

router.get('/organizations/:organizationId/ai-governance/reviews', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const query = listReviewsQuerySchema.parse(req.query);
    res.json({
      reviews: await service().listReviews({
        organizationId: params.organizationId,
        userId: req.auth.userId,
        systemId: query.systemId || null,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'AI Governance Review List');
  }
});

router.get('/organizations/:organizationId/ai-governance/reviews/:reviewId', requireAuth, async (req, res) => {
  try {
    const params = reviewParamsSchema.parse(req.params);
    res.json({
      review: await service().getReview({
        organizationId: params.organizationId,
        userId: req.auth.userId,
        reviewId: params.reviewId,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'AI Governance Review Get');
  }
});

for (const [action, method] of [
  ['submit', 'submitReview'],
  ['review', 'markReviewed'],
  ['reopen', 'reopenReview'],
]) {
  router.post(`/organizations/:organizationId/ai-governance/reviews/:reviewId/${action}`, requireAuth, async (req, res) => {
    try {
      const params = reviewParamsSchema.parse(req.params);
      emptyBodySchema.parse(req.body || {});
      res.json({
        review: await service()[method]({
          organizationId: params.organizationId,
          userId: req.auth.userId,
          reviewId: params.reviewId,
        }),
      });
    } catch (error) {
      sendRouteError(res, error, `AI Governance Review ${action}`);
    }
  });
}

module.exports = {
  aiGovernanceRoutes: router,
  declarationSchema,
};
