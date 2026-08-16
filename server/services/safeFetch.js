const http = require('node:http');
const https = require('node:https');
const axios = require('axios');
const { config } = require('../config');
const { HttpError } = require('../lib/httpError');
const {
  assertPublicHttpTarget,
  createSafeLookup,
  normalizeHttpUrl,
} = require('../lib/targetSafety');

const safeLookup = createSafeLookup();
const safeHttpAgent = new http.Agent({ keepAlive: false, lookup: safeLookup });
const safeHttpsAgent = new https.Agent({ keepAlive: false, lookup: safeLookup });

async function safeGetWithMetadata(
  rawUrl,
  requestConfig = {},
  redirectsRemaining = config.maxRedirects,
) {
  const parsedUrl = normalizeHttpUrl(rawUrl);
  await assertPublicHttpTarget(parsedUrl);

  let response;
  try {
    response = await axios.get(parsedUrl.toString(), {
      ...requestConfig,
      timeout: config.scanTimeoutMs,
      maxRedirects: 0,
      maxContentLength: config.maxHtmlBytes,
      maxBodyLength: config.maxHtmlBytes,
      validateStatus: () => true,
      proxy: false,
      httpAgent: safeHttpAgent,
      httpsAgent: safeHttpsAgent,
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;

    console.error('[SafeFetch] Request failed:', error.message);
    throw new HttpError(502, 'Target could not be fetched safely.', 'TARGET_FETCH_FAILED');
  }

  if (response.status >= 300 && response.status < 400 && response.headers.location) {
    if (redirectsRemaining <= 0) {
      throw new HttpError(400, 'Target exceeded the allowed redirect limit.', 'TARGET_REDIRECT_LIMIT');
    }

    const redirectUrl = new URL(response.headers.location, parsedUrl).toString();
    return safeGetWithMetadata(redirectUrl, requestConfig, redirectsRemaining - 1);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new HttpError(
      502,
      `Target returned HTTP ${response.status}.`,
      'TARGET_HTTP_STATUS',
      { status: response.status },
    );
  }

  return {
    response,
    finalUrl: parsedUrl.toString(),
  };
}

async function safeGet(rawUrl, requestConfig = {}, redirectsRemaining = config.maxRedirects) {
  const result = await safeGetWithMetadata(rawUrl, requestConfig, redirectsRemaining);
  return result.response;
}

module.exports = {
  safeGet,
  safeGetWithMetadata,
};