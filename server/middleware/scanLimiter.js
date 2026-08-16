const rateLimit = require('express-rate-limit');

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  message: { error: 'Too many scan requests. Please try again later.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

module.exports = { scanLimiter };
