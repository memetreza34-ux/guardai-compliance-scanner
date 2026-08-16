const multer = require('multer');
const { z } = require('zod');
const { buildApiErrorBody } = require('../lib/apiError');
const { HttpError } = require('../lib/httpError');

function sendHttpError(res, error) {
  res.status(error.statusCode).json(buildApiErrorBody({
    statusCode: error.statusCode,
    code: error.code,
    message: error.message,
    details: error.details,
  }));
}

function sendRouteError(res, error, context) {
  console.error(`[${context}]`, error);

  if (error instanceof HttpError) {
    sendHttpError(res, error);
    return;
  }

  if (error instanceof z.ZodError) {
    res.status(400).json(buildApiErrorBody({
      statusCode: 400,
      code: 'INVALID_REQUEST',
      message: 'Invalid request.',
      details: error.issues,
    }));
    return;
  }

  res.status(500).json(buildApiErrorBody({
    statusCode: 500,
    message: 'GuardAI scanner encountered an unexpected error.',
  }));
}

function errorHandler(error, _req, res, _next) {
  if (error instanceof multer.MulterError) {
    const fileTooLarge = error.code === 'LIMIT_FILE_SIZE';
    res.status(fileTooLarge ? 413 : 400).json(buildApiErrorBody({
      statusCode: fileTooLarge ? 413 : 400,
      code: fileTooLarge ? 'UPLOAD_TOO_LARGE' : 'UPLOAD_REJECTED',
      message: fileTooLarge
        ? 'Uploaded file exceeds the 10 MB limit.'
        : 'File upload was rejected.',
    }));
    return;
  }

  if (error instanceof HttpError) {
    sendHttpError(res, error);
    return;
  }

  console.error('[Unhandled API Error]', error);
  res.status(500).json(buildApiErrorBody({
    statusCode: 500,
    message: 'Unexpected server error.',
  }));
}

module.exports = {
  errorHandler,
  sendRouteError,
};
