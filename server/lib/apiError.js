const STATUS_CODE_MAP = Object.freeze({
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  501: 'NOT_IMPLEMENTED',
  502: 'UPSTREAM_ERROR',
  503: 'SERVICE_UNAVAILABLE',
});

function defaultErrorCode(statusCode) {
  return STATUS_CODE_MAP[statusCode] || 'HTTP_ERROR';
}

function buildApiErrorBody({ statusCode, message, code = null, details = null }) {
  const error = {
    code: code || defaultErrorCode(statusCode),
    message,
  };

  if (details !== null && details !== undefined) {
    error.details = details;
  }

  return { error };
}

module.exports = {
  buildApiErrorBody,
  defaultErrorCode,
};
