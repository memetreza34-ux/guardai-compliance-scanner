const rateLimit = require('express-rate-limit');
const { buildApiErrorBody } = require('../lib/apiError');

const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(_req, res) {
    res.status(429).json(buildApiErrorBody({
      statusCode: 429,
      code: 'LEAD_RATE_LIMITED',
      message: 'Too many contact requests. Please try again later.',
      requestId: res.locals.requestId,
    }));
  },
});

module.exports = { leadLimiter };
