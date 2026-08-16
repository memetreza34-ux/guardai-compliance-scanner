const rateLimit = require('express-rate-limit');
const { sendApiError } = require('../lib/apiError');

const verificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(_req, res) {
    sendApiError(res, 429, 'VERIFICATION_RATE_LIMITED', 'Too many target verification requests. Please try again later.');
  },
});

module.exports = { verificationLimiter };
