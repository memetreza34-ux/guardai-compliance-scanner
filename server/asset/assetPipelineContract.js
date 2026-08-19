const { HttpError } = require('../lib/httpError');

const ASSET_PIPELINE_VERSION = '0.1.0';
const ASSET_MEDIA_TYPES = Object.freeze(['application/pdf', 'text/plain']);
const DEFAULT_ASSET_LIMITS = Object.freeze({
  maxUploadBytes: 10 * 1024 * 1024,
  uploadSessionTtlSeconds: 15 * 60,
  maxExtractedTextChars: 100000,
  maxParserSeconds: 30,
});

function normalizeAssetLimits(input = DEFAULT_ASSET_LIMITS) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Asset limits must be an object.');
  }

  const limits = {
    maxUploadBytes: Number(input.maxUploadBytes),
    uploadSessionTtlSeconds: Number(input.uploadSessionTtlSeconds),
    maxExtractedTextChars: Number(input.maxExtractedTextChars),
    maxParserSeconds: Number(input.maxParserSeconds),
  };

  if (!Number.isInteger(limits.maxUploadBytes) || limits.maxUploadBytes < 1024 || limits.maxUploadBytes > 50 * 1024 * 1024) {
    throw new TypeError('Asset upload byte limit is outside GuardAI bounds.');
  }
  if (!Number.isInteger(limits.uploadSessionTtlSeconds) || limits.uploadSessionTtlSeconds < 60 || limits.uploadSessionTtlSeconds > 3600) {
    throw new TypeError('Asset upload-session TTL is outside GuardAI bounds.');
  }
  if (!Number.isInteger(limits.maxExtractedTextChars) || limits.maxExtractedTextChars < 1000 || limits.maxExtractedTextChars > 1000000) {
    throw new TypeError('Asset extracted-text limit is outside GuardAI bounds.');
  }
  if (!Number.isInteger(limits.maxParserSeconds) || limits.maxParserSeconds < 1 || limits.maxParserSeconds > 120) {
    throw new TypeError('Asset parser timeout is outside GuardAI bounds.');
  }

  return Object.freeze(limits);
}

function assertStorageAttestation(attestation) {
  const requiredTrue = [
    'privateByDefault',
    'publicReadDisabled',
    'executableServingDisabled',
    'serverSideEncryption',
    'boundedUploadPolicy',
    'organizationObjectKeyIsolation',
    'quarantineLifecycleConfigured',
    'cleanObjectLifecycleConfigured',
    'promotionIsIdempotentCopy',
  ];
  if (!attestation || typeof attestation !== 'object' || Array.isArray(attestation)) {
    throw new HttpError(503, 'Asset quarantine storage attestation is missing.', 'ASSET_STORAGE_NOT_SAFE');
  }
  const missing = requiredTrue.filter((key) => attestation[key] !== true);
  if (missing.length > 0) {
    throw new HttpError(503, 'Asset quarantine storage is not safely configured.', 'ASSET_STORAGE_NOT_SAFE', { missingControls: missing });
  }
  if (typeof attestation.providerId !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(attestation.providerId)) {
    throw new HttpError(503, 'Asset storage provider provenance is invalid.', 'ASSET_STORAGE_NOT_SAFE');
  }
  return Object.freeze({ providerId: attestation.providerId, ...Object.fromEntries(requiredTrue.map((key) => [key, true])) });
}

function assertMalwareScannerAttestation(attestation) {
  const requiredTrue = ['isolatedExecution', 'failClosedOnScannerError', 'signatureVersionReported', 'noPublicArtifactAccess'];
  if (!attestation || typeof attestation !== 'object' || Array.isArray(attestation)) {
    throw new HttpError(503, 'Malware scanner attestation is missing.', 'ASSET_MALWARE_SCANNER_NOT_SAFE');
  }
  const missing = requiredTrue.filter((key) => attestation[key] !== true);
  if (missing.length > 0) {
    throw new HttpError(503, 'Malware scanner is not safely configured.', 'ASSET_MALWARE_SCANNER_NOT_SAFE', { missingControls: missing });
  }
  if (
    typeof attestation.engineId !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(attestation.engineId) ||
    typeof attestation.engineVersion !== 'string' || attestation.engineVersion.length < 1 || attestation.engineVersion.length > 80
  ) {
    throw new HttpError(503, 'Malware scanner provenance is invalid.', 'ASSET_MALWARE_SCANNER_NOT_SAFE');
  }
  return Object.freeze({
    engineId: attestation.engineId,
    engineVersion: attestation.engineVersion,
    ...Object.fromEntries(requiredTrue.map((key) => [key, true])),
  });
}

function assertParserAttestation(attestation) {
  const requiredTrue = ['isolatedExecution', 'networkDisabled', 'ephemeralFilesystem', 'resourceLimitsEnforced', 'outputLimitEnforced'];
  if (!attestation || typeof attestation !== 'object' || Array.isArray(attestation)) {
    throw new HttpError(503, 'Asset parser attestation is missing.', 'ASSET_PARSER_NOT_SAFE');
  }
  const missing = requiredTrue.filter((key) => attestation[key] !== true);
  if (missing.length > 0) {
    throw new HttpError(503, 'Asset parser is not safely configured.', 'ASSET_PARSER_NOT_SAFE', { missingControls: missing });
  }
  if (
    typeof attestation.parserId !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(attestation.parserId) ||
    typeof attestation.parserVersion !== 'string' || attestation.parserVersion.length < 1 || attestation.parserVersion.length > 80
  ) {
    throw new HttpError(503, 'Asset parser provenance is invalid.', 'ASSET_PARSER_NOT_SAFE');
  }
  return Object.freeze({
    parserId: attestation.parserId,
    parserVersion: attestation.parserVersion,
    ...Object.fromEntries(requiredTrue.map((key) => [key, true])),
  });
}

function assertAssetPipelineProviders({ storageProvider, malwareScanner, parserProvider }) {
  if (
    !storageProvider ||
    typeof storageProvider.getSafetyAttestation !== 'function' ||
    typeof storageProvider.createQuarantineUpload !== 'function' ||
    typeof storageProvider.statQuarantineObject !== 'function' ||
    typeof storageProvider.openQuarantineReadStream !== 'function' ||
    typeof storageProvider.promoteQuarantineObject !== 'function' ||
    typeof storageProvider.deleteQuarantineObject !== 'function'
  ) {
    throw new HttpError(503, 'Asset quarantine storage provider is not configured.', 'ASSET_STORAGE_NOT_CONFIGURED');
  }
  if (
    !malwareScanner ||
    typeof malwareScanner.getSafetyAttestation !== 'function' ||
    typeof malwareScanner.scanQuarantineObject !== 'function'
  ) {
    throw new HttpError(503, 'Asset malware scanner is not configured.', 'ASSET_MALWARE_SCANNER_NOT_CONFIGURED');
  }
  if (
    !parserProvider ||
    typeof parserProvider.getSafetyAttestation !== 'function' ||
    typeof parserProvider.parseQuarantineObject !== 'function'
  ) {
    throw new HttpError(503, 'Asset parser provider is not configured.', 'ASSET_PARSER_NOT_CONFIGURED');
  }

  return Object.freeze({
    storage: assertStorageAttestation(storageProvider.getSafetyAttestation()),
    malware: assertMalwareScannerAttestation(malwareScanner.getSafetyAttestation()),
    parser: assertParserAttestation(parserProvider.getSafetyAttestation()),
  });
}

module.exports = {
  ASSET_MEDIA_TYPES,
  ASSET_PIPELINE_VERSION,
  assertAssetPipelineProviders,
  assertMalwareScannerAttestation,
  assertParserAttestation,
  assertStorageAttestation,
  DEFAULT_ASSET_LIMITS,
  normalizeAssetLimits,
};
