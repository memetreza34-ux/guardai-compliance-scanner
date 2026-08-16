const express = require('express');
const { config } = require('../config');
const { getReadiness } = require('../services/readinessService');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'guardai-api',
    scannerVersion: config.scannerVersion,
  });
});

router.get('/ready', async (_req, res) => {
  const readiness = await getReadiness();
  res.status(readiness.ready ? 200 : 503).json({
    status: readiness.ready ? 'ready' : 'not_ready',
    service: 'guardai-api',
    checks: readiness.checks,
  });
});

module.exports = { healthRoutes: router };
