const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getMonitoringPersistenceServices } = require('../services/monitoringPersistence');

const router = express.Router();

const organizationParamsSchema = z.object({ organizationId: z.string().uuid() });
const monitorParamsSchema = z.object({
  organizationId: z.string().uuid(),
  monitorId: z.string().uuid(),
});
const createSchema = z.object({
  targetId: z.string().uuid(),
  moduleId: z.literal('security').default('security'),
  scheduleMinutes: z.number().int().min(60).max(10080),
}).strict();
const statusSchema = z.object({
  status: z.enum(['active', 'paused', 'disabled']),
}).strict();

router.get('/organizations/:organizationId/monitors', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const { monitoringService } = getMonitoringPersistenceServices();
    res.json({
      monitors: await monitoringService.list({
        organizationId: params.organizationId,
        userId: req.auth.userId,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'Monitor List');
  }
});

router.post('/organizations/:organizationId/monitors', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const body = createSchema.parse(req.body);
    const { monitoringService } = getMonitoringPersistenceServices();
    const monitor = await monitoringService.create({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      targetId: body.targetId,
      moduleId: body.moduleId,
      scheduleMinutes: body.scheduleMinutes,
    });
    res.status(201).json({ monitor });
  } catch (error) {
    sendRouteError(res, error, 'Monitor Create');
  }
});

router.patch('/organizations/:organizationId/monitors/:monitorId', requireAuth, async (req, res) => {
  try {
    const params = monitorParamsSchema.parse(req.params);
    const body = statusSchema.parse(req.body);
    const { monitoringService } = getMonitoringPersistenceServices();
    res.json({
      monitor: await monitoringService.changeStatus({
        organizationId: params.organizationId,
        userId: req.auth.userId,
        monitorId: params.monitorId,
        status: body.status,
      }),
    });
  } catch (error) {
    sendRouteError(res, error, 'Monitor Status');
  }
});

module.exports = { monitorRoutes: router };
