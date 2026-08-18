const express = require('express');
const { z } = require('zod');
const { config } = require('../config');
const { resolveLeadCapturePolicy } = require('../services/leadCaptureService');
const { sendRouteError } = require('../middleware/errorHandler');
const { leadLimiter } = require('../middleware/leadLimiter');
const { getLeadPersistenceServices } = require('../services/leadPersistence');

const router = express.Router();

const submissionSchema = z.object({
  email: z.string().min(3).max(320),
  name: z.string().max(120).optional(),
  company: z.string().max(160).optional(),
  message: z.string().max(2000).optional(),
  marketingOptIn: z.boolean().optional().default(false),
  website: z.string().max(200).optional(),
}).strict();

router.get('/public/lead-capture', (_req, res) => {
  try {
    res.json({ leadCapture: resolveLeadCapturePolicy(config) });
  } catch (error) {
    sendRouteError(res, error, 'Lead Capture Config');
  }
});

router.post('/public/leads', leadLimiter, async (req, res) => {
  try {
    const input = submissionSchema.parse(req.body);
    const { leadCaptureService } = getLeadPersistenceServices();
    const result = await leadCaptureService.submit({
      idempotencyKey: req.get('Idempotency-Key'),
      input,
    });
    res.status(result.idempotentReplay ? 200 : 202).json(result);
  } catch (error) {
    sendRouteError(res, error, 'Lead Capture Submit');
  }
});

module.exports = { leadRoutes: router };
