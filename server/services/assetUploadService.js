const { ASSET_PIPELINE_VERSION, DEFAULT_ASSET_LIMITS, assertAssetPipelineProviders, normalizeAssetLimits } = require('../asset/assetPipelineContract');
const { createAssetUploadIdentity, normalizeAssetUploadRequest } = require('../domain/assetUpload');
const { HttpError } = require('../lib/httpError');

function publicAssetUpload(upload) {
  return {
    id: upload.id,
    organizationId: upload.organizationId,
    targetId: upload.targetId,
    status: upload.status,
    pipelineVersion: upload.pipelineVersion,
    fileName: upload.fileName,
    declaredMediaType: upload.declaredMediaType,
    declaredByteLength: upload.declaredByteLength,
    detectedMediaType: upload.detectedMediaType,
    actualByteLength: upload.actualByteLength,
    contentSha256: upload.contentSha256,
    malwareVerdict: upload.malwareVerdict,
    malwareEngineId: upload.malwareEngineId,
    malwareEngineVersion: upload.malwareEngineVersion,
    malwareSignatureVersion: upload.malwareSignatureVersion,
    parserId: upload.parserId,
    parserVersion: upload.parserVersion,
    extractedTextSha256: upload.extractedTextSha256,
    extractedTextLength: upload.extractedTextLength,
    pageCount: upload.pageCount,
    uploadExpiresAt: upload.uploadExpiresAt,
    uploadedAt: upload.uploadedAt,
    processingStartedAt: upload.processingStartedAt,
    completedAt: upload.completedAt,
    errorCode: upload.errorCode,
    errorMessage: upload.errorMessage,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
  };
}

function normalizeUploadDescriptor(descriptor, expectedExpiresAt) {
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
    throw new HttpError(502, 'Asset storage provider returned an invalid upload descriptor.', 'ASSET_UPLOAD_DESCRIPTOR_INVALID');
  }
  if (String(descriptor.method || '').toUpperCase() !== 'PUT') {
    throw new HttpError(502, 'Asset storage upload method must be PUT.', 'ASSET_UPLOAD_DESCRIPTOR_INVALID');
  }
  let url;
  try {
    url = new URL(descriptor.url);
  } catch {
    throw new HttpError(502, 'Asset storage upload URL is invalid.', 'ASSET_UPLOAD_DESCRIPTOR_INVALID');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new HttpError(502, 'Asset storage upload URL must be HTTPS without embedded credentials.', 'ASSET_UPLOAD_DESCRIPTOR_INVALID');
  }
  const headers = {};
  if (descriptor.headers !== undefined) {
    if (!descriptor.headers || typeof descriptor.headers !== 'object' || Array.isArray(descriptor.headers)) {
      throw new HttpError(502, 'Asset storage upload headers are invalid.', 'ASSET_UPLOAD_DESCRIPTOR_INVALID');
    }
    for (const [key, value] of Object.entries(descriptor.headers)) {
      if (!/^[A-Za-z0-9-]{1,80}$/.test(key) || typeof value !== 'string' || value.length > 1000 || /[\r\n]/.test(value)) {
        throw new HttpError(502, 'Asset storage upload header is invalid.', 'ASSET_UPLOAD_DESCRIPTOR_INVALID');
      }
      headers[key] = value;
    }
  }
  const expiresAt = new Date(descriptor.expiresAt);
  const expected = new Date(expectedExpiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() > expected.getTime() || expiresAt.getTime() <= Date.now()) {
    throw new HttpError(502, 'Asset storage upload expiry is invalid.', 'ASSET_UPLOAD_DESCRIPTOR_INVALID');
  }
  return Object.freeze({ method: 'PUT', url: url.toString(), headers, expiresAt: expiresAt.toISOString() });
}

function createAssetUploadService({
  organizationAuthorization,
  assetUploadRepository,
  storageProvider,
  malwareScanner,
  parserProvider,
  limits = DEFAULT_ASSET_LIMITS,
}) {
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Asset upload service requires Organization authorization.');
  }
  if (!assetUploadRepository) throw new TypeError('Asset upload service requires Asset upload repository.');
  const normalizedLimits = normalizeAssetLimits(limits);

  function assertProviders() {
    return assertAssetPipelineProviders({ storageProvider, malwareScanner, parserProvider });
  }

  async function createUploadSession({ organizationId, userId, input }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'member');
    assertProviders();
    const declared = normalizeAssetUploadRequest(input, normalizedLimits);
    const identity = createAssetUploadIdentity(organizationId);
    const uploadExpiresAt = new Date(Date.now() + normalizedLimits.uploadSessionTtlSeconds * 1000);

    const upload = await assetUploadRepository.createPendingUpload({
      id: identity.uploadId,
      organizationId,
      createdBy: userId,
      pipelineVersion: ASSET_PIPELINE_VERSION,
      quarantineObjectKey: identity.quarantineObjectKey,
      fileName: declared.fileName,
      mediaType: declared.mediaType,
      byteLength: declared.byteLength,
      uploadExpiresAt,
    });

    try {
      const descriptor = normalizeUploadDescriptor(
        await storageProvider.createQuarantineUpload({
          organizationId,
          objectKey: identity.quarantineObjectKey,
          mediaType: declared.mediaType,
          byteLength: declared.byteLength,
          expiresAt: uploadExpiresAt,
        }),
        uploadExpiresAt,
      );
      return { upload: publicAssetUpload(upload), transfer: descriptor };
    } catch (error) {
      await assetUploadRepository.markUploadSessionFailed({
        organizationId,
        uploadId: upload.id,
        errorCode: 'ASSET_UPLOAD_SESSION_PROVIDER_FAILED',
        errorMessage: 'Quarantine upload session could not be created.',
      }).catch(() => {});
      throw error;
    }
  }

  async function finalizeUpload({ organizationId, userId, uploadId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'member');
    assertProviders();
    const upload = await assetUploadRepository.getUpload(organizationId, uploadId);
    if (!upload) throw new HttpError(404, 'Asset upload was not found.', 'ASSET_UPLOAD_NOT_FOUND');
    if (['uploaded','processing','clean','infected','rejected'].includes(upload.status)) {
      const replay = await assetUploadRepository.finalizeUploadAndQueue({ organizationId, uploadId });
      return { ...replay, upload: publicAssetUpload(replay.upload) };
    }
    if (upload.status !== 'awaiting_upload') {
      throw new HttpError(409, 'Asset upload cannot be finalized in its current state.', 'ASSET_UPLOAD_STATE_INVALID');
    }
    if (new Date(upload.uploadExpiresAt).getTime() <= Date.now()) {
      await assetUploadRepository.finalizeUploadAndQueue({ organizationId, uploadId });
    }

    let stat;
    try {
      stat = await storageProvider.statQuarantineObject({
        organizationId,
        objectKey: upload.quarantineObjectKey,
      });
    } catch (error) {
      throw new HttpError(503, 'Quarantine object status is temporarily unavailable.', 'ASSET_STORAGE_STAT_FAILED');
    }
    if (!stat || stat.exists !== true || !Number.isInteger(Number(stat.byteLength))) {
      throw new HttpError(409, 'Quarantine upload is not present yet.', 'ASSET_UPLOAD_NOT_PRESENT');
    }
    if (Number(stat.byteLength) !== upload.declaredByteLength) {
      await assetUploadRepository.markUploadSessionFailed({
        organizationId,
        uploadId,
        errorCode: 'ASSET_UPLOAD_SIZE_MISMATCH',
        errorMessage: 'Stored Asset size differs from the declared upload size.',
      });
      await storageProvider.deleteQuarantineObject({ organizationId, objectKey: upload.quarantineObjectKey }).catch(() => {});
      throw new HttpError(422, 'Stored Asset size differs from the declared upload size.', 'ASSET_UPLOAD_SIZE_MISMATCH');
    }

    const finalized = await assetUploadRepository.finalizeUploadAndQueue({ organizationId, uploadId });
    return { ...finalized, upload: publicAssetUpload(finalized.upload) };
  }

  async function listUploads({ organizationId, userId, limit = 50 }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    return (await assetUploadRepository.listUploads(organizationId, { limit })).map(publicAssetUpload);
  }

  async function getUpload({ organizationId, userId, uploadId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const upload = await assetUploadRepository.getUpload(organizationId, uploadId);
    if (!upload) throw new HttpError(404, 'Asset upload was not found.', 'ASSET_UPLOAD_NOT_FOUND');
    return publicAssetUpload(upload);
  }

  return {
    createUploadSession,
    finalizeUpload,
    getUpload,
    listUploads,
  };
}

module.exports = {
  createAssetUploadService,
  normalizeUploadDescriptor,
  publicAssetUpload,
};
