const multer = require('multer');
const { z } = require('zod');
const { HttpError } = require('../lib/httpError');

function sendRouteError(res, error, context) {
  console.error(`[${context}]`, error);

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Invalid request.', details: error.issues });
    return;
  }

  res.status(500).json({ error: 'GuardAI scanner encountered an unexpected error.' });
}

function errorHandler(error, _req, res, _next) {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Uploaded file exceeds the 10 MB limit.'
      : 'File upload was rejected.';
    res.status(400).json({ error: message });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error('[Unhandled API Error]', error);
  res.status(500).json({ error: 'Unexpected server error.' });
}

module.exports = {
  errorHandler,
  sendRouteError,
};
