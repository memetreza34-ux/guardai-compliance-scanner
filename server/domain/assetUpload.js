const crypto = require('node:crypto');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const { ASSET_MEDIA_TYPES, DEFAULT_ASSET_LIMITS, normalizeAssetLimits } = require('../asset/assetPipelineContract');
const { HttpError } = require('../lib/httpError');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_RE = /^[a-f0-9]{64}$/;

function normalizeAssetFileName(value) {
  if (typeof value !== 'string') {
    throw new HttpError(400, 'Asset file name is required.', 'ASSET_FILE_NAME_REQUIRED');
  }
  const base = path.basename(value.trim()).replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ');
  if (base.length < 1 || base.length > 180) {
    throw new HttpError(400, 'Asset file name must contain 1 to 180 characters.', 'ASSET_FILE_NAME_INVALID');
  }
  return base;
}

function normalizeAssetUploadRequest(input, limits = DEFAULT_ASSET_LIMITS) {
  const normalizedLimits = normalizeAssetLimits(limits);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'Asset upload request is invalid.', 'ASSET_UPLOAD_REQUEST_INVALID');
  }
  const fileName = normalizeAssetFileName(input.fileName);
  const mediaType = typeof input.mediaType === 'string' ? input.mediaType.trim().toLowerCase() : '';
  const byteLength = Number(input.byteLength);

  if (!ASSET_MEDIA_TYPES.includes(mediaType)) {
    throw new HttpError(415, 'Only PDF and plain-text assets are supported.', 'ASSET_MEDIA_TYPE_UNSUPPORTED');
  }
  if (!Number.isInteger(byteLength) || byteLength < 1 || byteLength > normalizedLimits.maxUploadBytes) {
    throw new HttpError(413, 'Asset byte length is outside GuardAI upload limits.', 'ASSET_UPLOAD_SIZE_INVALID');
  }

  const extension = path.extname(fileName).toLowerCase();
  if ((mediaType === 'application/pdf' && extension !== '.pdf') || (mediaType === 'text/plain' && extension !== '.txt')) {
    throw new HttpError(415, 'Asset extension and declared media type do not match.', 'ASSET_EXTENSION_MISMATCH');
  }

  return Object.freeze({ fileName, mediaType, byteLength });
}

function createAssetUploadIdentity(organizationId) {
  if (!UUID_RE.test(String(organizationId || ''))) {
    throw new TypeError('Asset upload requires a valid Organization UUID.');
  }
  const uploadId = crypto.randomUUID();
  return Object.freeze({
    uploadId,
    objectKey: `quarantine/${organizationId}/${uploadId}`,
  });
}

function detectAssetMediaType(headBuffer) {
  if (!Buffer.isBuffer(headBuffer) || headBuffer.length === 0) {
    throw new HttpError(422, 'Asset content sample is missing.', 'ASSET_CONTENT_SAMPLE_MISSING');
  }
  if (headBuffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (headBuffer.includes(0)) {
    throw new HttpError(415, 'Asset contains binary null bytes and is not accepted as plain text.', 'ASSET_BINARY_CONTENT_REJECTED');
  }
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(headBuffer);
    return 'text/plain';
  } catch {
    throw new HttpError(415, 'Asset does not contain valid UTF-8 plain text.', 'ASSET_TEXT_ENCODING_INVALID');
  }
}

function assertObservedAssetMetadata({ declared, observed }) {
  if (!declared || !observed) {
    throw new HttpError(422, 'Asset upload metadata is incomplete.', 'ASSET_UPLOAD_METADATA_INCOMPLETE');
  }
  const actualByteLength = Number(observed.byteLength);
  const sha256 = String(observed.sha256 || '').toLowerCase();
  const detectedMediaType = String(observed.detectedMediaType || '').toLowerCase();

  if (!Number.isInteger(actualByteLength) || actualByteLength !== declared.byteLength) {
    throw new HttpError(422, 'Stored Asset size differs from the declared upload size.', 'ASSET_UPLOAD_SIZE_MISMATCH');
  }
  if (!SHA256_RE.test(sha256)) {
    throw new HttpError(500, 'Asset SHA-256 provenance is invalid.', 'ASSET_SHA256_INVALID');
  }
  if (detectedMediaType !== declared.mediaType) {
    throw new HttpError(415, 'Stored Asset content does not match the declared media type.', 'ASSET_MEDIA_TYPE_MISMATCH');
  }

  return Object.freeze({ actualByteLength, sha256, detectedMediaType });
}

async function hashAndSniffAssetStream(readable, maxBytes = DEFAULT_ASSET_LIMITS.maxUploadBytes) {
  if (!readable || typeof readable[Symbol.asyncIterator] !== 'function') {
    throw new TypeError('Asset content verification requires an async-readable stream.');
  }
  const hash = crypto.createHash('sha256');
  const headChunks = [];
  let headBytes = 0;
  let totalBytes = 0;
  const HEAD_LIMIT = 8192;

  for await (const chunkValue of readable) {
    const chunk = Buffer.isBuffer(chunkValue) ? chunkValue : Buffer.from(chunkValue);
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) {
      if (typeof readable.destroy === 'function') readable.destroy();
      throw new HttpError(413, 'Stored Asset exceeds GuardAI upload limits.', 'ASSET_UPLOAD_SIZE_EXCEEDED');
    }
    hash.update(chunk);
    if (headBytes < HEAD_LIMIT) {
      const remaining = HEAD_LIMIT - headBytes;
      const slice = chunk.subarray(0, remaining);
      headChunks.push(slice);
      headBytes += slice.length;
    }
  }

  if (totalBytes < 1) {
    throw new HttpError(422, 'Stored Asset is empty.', 'ASSET_UPLOAD_EMPTY');
  }
  const head = Buffer.concat(headChunks);
  return Object.freeze({
    byteLength: totalBytes,
    sha256: hash.digest('hex'),
    detectedMediaType: detectAssetMediaType(head),
  });
}

function normalizeMalwareVerdict(result, attestation) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new HttpError(502, 'Malware scanner returned an invalid result.', 'ASSET_MALWARE_RESULT_INVALID');
  }
  if (!['clean', 'infected'].includes(result.verdict)) {
    throw new HttpError(502, 'Malware scanner must return a clean or infected verdict.', 'ASSET_MALWARE_RESULT_INVALID');
  }
  const signatureVersion = String(result.signatureVersion || '').trim();
  if (signatureVersion.length < 1 || signatureVersion.length > 120) {
    throw new HttpError(502, 'Malware signature provenance is invalid.', 'ASSET_MALWARE_RESULT_INVALID');
  }
  return Object.freeze({
    verdict: result.verdict,
    engineId: attestation.engineId,
    engineVersion: attestation.engineVersion,
    signatureVersion,
  });
}

function normalizeParserResult(result, attestation, limits = DEFAULT_ASSET_LIMITS) {
  const normalizedLimits = normalizeAssetLimits(limits);
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new HttpError(502, 'Asset parser returned an invalid result.', 'ASSET_PARSER_RESULT_INVALID');
  }
  if (typeof result.text !== 'string' || result.text.length > normalizedLimits.maxExtractedTextChars) {
    throw new HttpError(422, 'Asset parser output exceeds GuardAI limits.', 'ASSET_PARSER_OUTPUT_LIMIT');
  }
  const text = result.text;
  return Object.freeze({
    parserId: attestation.parserId,
    parserVersion: attestation.parserVersion,
    extractedTextLength: text.length,
    extractedTextSha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex'),
    pageCount: Number.isInteger(result.pageCount) && result.pageCount >= 0 ? result.pageCount : null,
    text,
  });
}

module.exports = {
  assertObservedAssetMetadata,
  createAssetUploadIdentity,
  detectAssetMediaType,
  hashAndSniffAssetStream,
  normalizeAssetFileName,
  normalizeAssetUploadRequest,
  normalizeMalwareVerdict,
  normalizeParserResult,
  SHA256_RE,
  UUID_RE,
};
