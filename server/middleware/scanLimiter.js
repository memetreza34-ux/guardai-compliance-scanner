const rateLimit = require('express-rate-limit');
const { buildApiErrorBody } = require('../lib/apiError');

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(_req, res) {
    res.status(429).json(buildApiErrorBody({
      statusCode: 429,
      code: 'SCAN_RATE_LIMITED',
      message: 'Too many scan requests. Please try again later.',
    }));
  },
});

module.exports = { scanLimiter };
