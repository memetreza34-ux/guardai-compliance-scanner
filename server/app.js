const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config } = require('./config');
const { buildApiErrorBody } = require('./lib/apiError');
const { HttpError } = require('./lib/httpError');
const { errorHandler } = require('./middleware/errorHandler');
const { requestContext } = require('./middleware/requestContext');
const { auditRoutes } = require('./routes/auditRoutes');
const { authRoutes } = require('./routes/authRoutes');
const { healthRoutes } = require('./routes/healthRoutes');
const { organizationRoutes } = require('./routes/organizationRoutes');
const { reportRoutes } = require('./routes/reportRoutes');
const { scanRoutes } = require('./routes/scanRoutes');
const { secureProductRoutes } = require('./routes/secureProductRoutes');
const { targetRoutes } = require('./routes/targetRoutes');
const { targetVerificationRoutes } = require('./routes/targetVerificationRoutes');
const { trustPublicationRoutes } = require('./routes/trustPublicationRoutes');
const { workspaceScanRoutes } = require('./routes/workspaceScanRoutes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new HttpError(403, 'Origin is not allowed by GuardAI CORS policy.', 'CORS_ORIGIN_FORBIDDEN'));
    },
  }));
  app.use(express.json({ limit: '10kb' }));

  app.use('/api', healthRoutes);
  app.use('/api/v1', authRoutes);
  app.use('/api/v1', organizationRoutes);
  app.use('/api/v1', auditRoutes);
  app.use('/api/v1', scanRoutes);
  app.use('/api/v1', targetRoutes);
  app.use('/api/v1', targetVerificationRoutes);
  app.use('/api/v1', workspaceScanRoutes);
  app.use('/api/v1', secureProductRoutes);
  app.use('/api/v1', reportRoutes);
  app.use('/api/v1', trustPublicationRoutes);

  app.use((_req, res) => {
    res.status(404).json(buildApiErrorBody({
      statusCode: 404,
      code: 'API_ROUTE_NOT_FOUND',
      message: 'GuardAI API route not found.',
      requestId: res.locals.requestId,
    }));
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
