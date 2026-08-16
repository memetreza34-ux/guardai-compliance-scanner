const rateLimit = require('express-rate-limit');
const { buildApiErrorBody } = require('../lib/apiError');

const trustLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(_req, res) {
    res.status(429).json(buildApiErrorBody({
      statusCode: 429,
      code: 'TRUST_RATE_LIMITED',
      message: 'Too many public Trust requests. Please try again later.',
      requestId: res.locals.requestId,
    }));
  },
});

module.exports = { trustLimiter };
