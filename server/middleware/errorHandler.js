const multer = require('multer');
const { z } = require('zod');
const { buildApiErrorBody } = require('../lib/apiError');
const { HttpError } = require('../lib/httpError');

function requestIdFromResponse(res) {
  return res.locals?.requestId || null;
}

function logApiError(context, res, error) {
  console.error(JSON.stringify({
    event: 'api_error',
    context,
    requestId: requestIdFromResponse(res),
    name: error?.name || 'Error',
    code: error?.code || null,
    statusCode: error?.statusCode || 500,
    message: error?.message || 'Unexpected error',
  }));
}

function sendHttpError(res, error) {
  res.status(error.statusCode).json(buildApiErrorBody({
    statusCode: error.statusCode,
    code: error.code,
    message: error.message,
    details: error.details,
    requestId: requestIdFromResponse(res),
  }));
}

function sendRouteError(res, error, context) {
  logApiError(context, res, error);

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
      requestId: requestIdFromResponse(res),
    }));
    return;
  }

  res.status(500).json(buildApiErrorBody({
    statusCode: 500,
    message: 'GuardAI scanner encountered an unexpected error.',
    requestId: requestIdFromResponse(res),
  }));
}

function errorHandler(error, _req, res, _next) {
  logApiError('Unhandled API Error', res, error);

  if (error instanceof multer.MulterError) {
    const fileTooLarge = error.code === 'LIMIT_FILE_SIZE';
    res.status(fileTooLarge ? 413 : 400).json(buildApiErrorBody({
      statusCode: fileTooLarge ? 413 : 400,
      code: fileTooLarge ? 'UPLOAD_TOO_LARGE' : 'UPLOAD_REJECTED',
      message: fileTooLarge
        ? 'Uploaded file exceeds the 10 MB limit.'
        : 'File upload was rejected.',
      requestId: requestIdFromResponse(res),
    }));
    return;
  }

  if (error instanceof HttpError) {
    sendHttpError(res, error);
    return;
  }

  res.status(500).json(buildApiErrorBody({
    statusCode: 500,
    message: 'Unexpected server error.',
    requestId: requestIdFromResponse(res),
  }));
}

module.exports = {
  errorHandler,
  logApiError,
  sendRouteError,
};
