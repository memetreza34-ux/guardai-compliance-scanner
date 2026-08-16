const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config } = require('./config');
const { HttpError } = require('./lib/httpError');
const { errorHandler } = require('./middleware/errorHandler');
const { authRoutes } = require('./routes/authRoutes');
const { healthRoutes } = require('./routes/healthRoutes');
const { scanRoutes } = require('./routes/scanRoutes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new HttpError(403, 'Origin is not allowed by GuardAI CORS policy.'));
    },
  }));
  app.use(express.json({ limit: '10kb' }));

  app.use('/api', healthRoutes);
  app.use('/api', authRoutes);
  app.use('/api', scanRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'GuardAI API route not found.' });
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
