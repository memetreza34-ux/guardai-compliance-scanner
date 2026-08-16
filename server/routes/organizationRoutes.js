const express = require('express');
const { z } = require('zod');
const { requireAuth } = require('../auth/supabaseAuth');
const { sendRouteError } = require('../middleware/errorHandler');
const { getPersistenceServices } = require('../services/persistenceServices');

const router = express.Router();

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(160),
});

router.get('/organizations', requireAuth, async (req, res) => {
  try {
    const { organizationService } = getPersistenceServices();
    const organizations = await organizationService.listForUser(req.auth.userId);
    res.json({ organizations });
  } catch (error) {
    sendRouteError(res, error, 'Organization List');
  }
});

router.post('/organizations', requireAuth, async (req, res) => {
  try {
    const body = createOrganizationSchema.parse(req.body);
    const { organizationService } = getPersistenceServices();
    const organization = await organizationService.create({
      userId: req.auth.userId,
      name: body.name,
    });

    res.status(201).json({ organization });
  } catch (error) {
    sendRouteError(res, error, 'Organization Create');
  }
});

module.exports = { organizationRoutes: router };
