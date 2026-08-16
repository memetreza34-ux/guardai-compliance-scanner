const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { trustLimiter } = require('../middleware/trustLimiter');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const organizationParamsSchema = z.object({ organizationId: z.string().uuid() });
const publicationParamsSchema = z.object({
  organizationId: z.string().uuid(),
  publicationId: z.string().uuid(),
});
const publishBodySchema = z.object({ reportId: z.string().uuid() });
const listQuerySchema = z.object({
  limit: z.string().max(3).optional(),
  cursor: z.string().max(500).optional(),
});
const publicParamsSchema = z.object({
  publicSlug: z.string().min(24).max(80).regex(/^[A-Za-z0-9_-]+$/),
});

function badgeDate(value) {
  if (typeof value !== 'string') return 'unknown-date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'unknown-date' : date.toISOString().slice(0, 10);
}

function buildBadgeSvg(projection) {
  const date = badgeDate(projection.screening.completedAt);
  const hashPrefix = projection.report.snapshotHash.slice(0, 8);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="360" height="48" viewBox="0 0 360 48" role="img" aria-label="GuardAI technical screening ${date}">
  <rect width="360" height="48" rx="8" fill="#111827"/>
  <text x="16" y="20" fill="#ffffff" font-family="Arial, sans-serif" font-size="13" font-weight="700">GuardAI technical screening</text>
  <text x="16" y="36" fill="#d1d5db" font-family="Arial, sans-serif" font-size="11">${date} · report ${hashPrefix}</text>
</svg>`;
}

router.post('/organizations/:organizationId/trust-publications', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const body = publishBodySchema.parse(req.body);
    const { trustPublicationService } = getPersistenceServices();
    const result = await trustPublicationService.publish({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      reportId: body.reportId,
    });
    res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    sendRouteError(res, error, 'Trust Publication Create');
  }
});

router.get('/organizations/:organizationId/trust-publications', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const query = listQuerySchema.parse(req.query);
    const { trustPublicationService } = getPersistenceServices();
    res.json(await trustPublicationService.list({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      limit: query.limit,
      cursor: query.cursor,
    }));
  } catch (error) {
    sendRouteError(res, error, 'Trust Publication List');
  }
});

router.post(
  '/organizations/:organizationId/trust-publications/:publicationId/revoke',
  requireAuth,
  async (req, res) => {
    try {
      const params = publicationParamsSchema.parse(req.params);
      const { trustPublicationService } = getPersistenceServices();
      const publication = await trustPublicationService.revoke({
        organizationId: params.organizationId,
        userId: req.auth.userId,
        publicationId: params.publicationId,
      });
      res.json({ publication });
    } catch (error) {
      sendRouteError(res, error, 'Trust Publication Revoke');
    }
  },
);

router.get('/public/trust/:publicSlug', trustLimiter, async (req, res) => {
  try {
    const params = publicParamsSchema.parse(req.params);
    const { trustPublicationService } = getPersistenceServices();
    const projection = await trustPublicationService.resolvePublic(params.publicSlug);
    res.set('Cache-Control', 'no-store');
    res.json(projection);
  } catch (error) {
    sendRouteError(res, error, 'Public Trust Read');
  }
});

router.get('/public/trust/:publicSlug/badge.svg', trustLimiter, async (req, res) => {
  try {
    const params = publicParamsSchema.parse(req.params);
    const { trustPublicationService } = getPersistenceServices();
    const projection = await trustPublicationService.resolvePublic(params.publicSlug);
    res.set({
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    });
    res.type('image/svg+xml').send(buildBadgeSvg(projection));
  } catch (error) {
    sendRouteError(res, error, 'Public Trust Badge');
  }
});

module.exports = {
  buildBadgeSvg,
  trustPublicationRoutes: router,
};
