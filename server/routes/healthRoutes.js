const express = require('express');
const { scanAccess } = require('../runtime');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'guardai-scanner-api',
    unauthenticatedAiScansEnabled: scanAccess.allowUnauthenticatedAiScans,
  });
});

module.exports = { healthRoutes: router };
