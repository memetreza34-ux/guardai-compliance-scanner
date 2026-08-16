const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getNotificationPersistenceServices } = require('../services/notificationPersistence');

const router = express.Router();

const organizationParamsSchema = z.object({ organizationId: z.string().uuid() });
const notificationParamsSchema = z.object({
  organizationId: z.string().uuid(),
  notificationId: z.string().uuid(),
});
const querySchema = z.object({
  unreadOnly: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().max(500).optional(),
});

router.get('/organizations/:organizationId/notifications', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const query = querySchema.parse(req.query);
    const { notificationService } = getNotificationPersistenceServices();
    res.json(await notificationService.list({
      organizationId: params.organizationId,
      userId: req.auth.userId,
      unreadOnly: query.unreadOnly === 'true',
      limit: query.limit,
      cursor: query.cursor,
    }));
  } catch (error) {
    sendRouteError(res, error, 'Notification List');
  }
});

router.post(
  '/organizations/:organizationId/notifications/:notificationId/read',
  requireAuth,
  async (req, res) => {
    try {
      const params = notificationParamsSchema.parse(req.params);
      const { notificationService } = getNotificationPersistenceServices();
      res.json({
        notification: await notificationService.markRead({
          organizationId: params.organizationId,
          userId: req.auth.userId,
          notificationId: params.notificationId,
        }),
      });
    } catch (error) {
      sendRouteError(res, error, 'Notification Mark Read');
    }
  },
);

router.post('/organizations/:organizationId/notifications/read-all', requireAuth, async (req, res) => {
  try {
    const params = organizationParamsSchema.parse(req.params);
    const { notificationService } = getNotificationPersistenceServices();
    res.json(await notificationService.markAllRead({
      organizationId: params.organizationId,
      userId: req.auth.userId,
    }));
  } catch (error) {
    sendRouteError(res, error, 'Notification Mark All Read');
  }
});

module.exports = { notificationRoutes: router };
