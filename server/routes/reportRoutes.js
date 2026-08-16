const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const organizationParamsSchema = z.object({ organizationId: z.string().uuid() });
const scanParamsSchema = z.object({
  organizationId: z.string().uuid(),
  scanId: z.string().uuid(),
});
const reportParamsSchema = z.object({
  organizationId: z.string().uuid(),
  reportId: z.string().uuid(),
});
const listQuerySchema = z.object({
  scanId: z.string().uuid().optional(),
  limit: z.string().max(3).optional(),
  cursor: z.string().max(500).optional(),
});

router.post('/organizations/:organizationId/scans/:scanId/reports', requireAuth, async (req, res) => {
  try {
    const params = scanParamsSchema.parse(req.params);
    const { reportService } = getPersistenceServices();
    const result = await reportService.create({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      scanId: params.scanId,
    });
    res.status(result.created ? 201 : 200).json({
      report: result.report,
      idempotentReplay: !result.created,
    });
  } catch (error) {
    sendRouteError(res, error, 'Report Create');
  }
});

router.get('/organizations/:organizationId/reports', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const query = listQuerySchema.parse(req.query);
    const { reportService } = getPersistenceServices();
    const page = await reportService.list({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      scanId: query.scanId,
      limit: query.limit,
      cursor: query.cursor,
    });
    res.json(page);
  } catch (error) {
    sendRouteError(res, error, 'Report List');
  }
});

router.get('/organizations/:organizationId/reports/:reportId', requireAuth, async (req, res) => {
  try {
    const params = reportParamsSchema.parse(req.params);
    const { reportService } = getPersistenceServices();
    const report = await reportService.get({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      reportId: params.reportId,
    });
    res.json({ report });
  } catch (error) {
    sendRouteError(res, error, 'Report Read');
  }
});

module.exports = { reportRoutes: router };
