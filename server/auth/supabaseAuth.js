const axios = require('axios');
const { config } = require('../config');
const { HttpError } = require('../lib/httpError');

function getBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') return null;

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function assertAuthConfigured() {
  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    throw new HttpError(503, 'GuardAI authentication is not configured yet.');
  }
}

async function verifySupabaseAccessToken(token) {
  assertAuthConfigured();

  let endpoint;
  try {
    endpoint = new URL('/auth/v1/user', config.supabaseUrl).toString();
  } catch {
    throw new HttpError(503, 'GuardAI authentication configuration is invalid.');
  }

  let response;
  try {
    response = await axios.get(endpoint, {
      headers: {
        apikey: config.supabasePublishableKey,
        Authorization: `Bearer ${token}`,
      },
      timeout: config.authTimeoutMs,
      maxRedirects: 0,
      proxy: false,
      validateStatus: () => true,
    });
  } catch (error) {
    console.error('[Auth] Supabase token validation request failed:', error.message);
    throw new HttpError(503, 'GuardAI authentication service is temporarily unavailable.');
  }

  if (response.status === 401 || response.status === 403) {
    throw new HttpError(401, 'Authentication token is invalid or expired.');
  }

  if (response.status !== 200) {
    throw new HttpError(503, 'GuardAI authentication service returned an unexpected response.');
  }

  const user = response.data;
  if (!user || typeof user !== 'object' || typeof user.id !== 'string') {
    throw new HttpError(503, 'GuardAI authentication service returned an invalid user payload.');
  }

  return {
    userId: user.id,
    email: typeof user.email === 'string' ? user.email : null,
  };
}

async function resolveRequestAuth(req) {
  const token = getBearerToken(req.headers.authorization);
  if (!token) return null;
  return verifySupabaseAccessToken(token);
}

async function optionalAuth(req, _res, next) {
  try {
    req.auth = await resolveRequestAuth(req);
    next();
  } catch (error) {
    next(error);
  }
}

async function requireAuth(req, _res, next) {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      throw new HttpError(401, 'Authentication required.');
    }

    req.auth = await verifySupabaseAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBearerToken,
  optionalAuth,
  requireAuth,
  verifySupabaseAccessToken,
};
