const test = require('node:test');
const assert = require('node:assert/strict');
const { createAssetUploadService } = require('../services/assetUploadService');

const orgId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';

function safeStorageAttestation() {
  return {
    providerId: 'test-storage', privateByDefault: true, publicReadDisabled: true,
    executableServingDisabled: true, serverSideEncryption: true, boundedUploadPolicy: true,
    organizationObjectKeyIsolation: true, quarantineLifecycleConfigured: true,
    cleanObjectLifecycleConfigured: true, promotionIsIdempotentCopy: true,
  };
}

function safeMalwareAttestation() {
  return {
    engineId: 'test-malware', engineVersion: '1.0.0', isolatedExecution: true,
    failClosedOnScannerError: true, signatureVersionReported: true,
    noPublicArtifactAccess: true, noDirectStorageCredentials: true,
  };
}

function safeParserAttestation() {
  return {
    parserId: 'test-parser', parserVersion: '1.0.0', isolatedExecution: true,
    networkDisabled: true, ephemeralFilesystem: true, resourceLimitsEnforced: true,
    outputLimitEnforced: true, noDirectStorageCredentials: true,
  };
}

function createHarness(options = {}) {
  let createInput = null;
  let failedInput = null;
  let deleteCalls = 0;
  let finalizeCalls = 0;
  const roleCalls = [];
  let storedUpload = null;

  const repository = {
    async createPendingUpload(input) {
      createInput = input;
      storedUpload = {
        id: input.id, organizationId: input.organizationId, targetId: null,
        status: 'awaiting_upload', pipelineVersion: input.pipelineVersion,
        quarantineObjectKey: input.quarantineObjectKey, cleanObjectKey: null,
        fileName: input.fileName, declaredMediaType: input.mediaType,
        declaredByteLength: input.byteLength, detectedMediaType: null,
        actualByteLength: null, contentSha256: null, malwareVerdict: null,
        malwareEngineId: null, malwareEngineVersion: null, malwareSignatureVersion: null,
        parserId: null, parserVersion: null, extractedTextSha256: null,
        extractedTextLength: null, pageCount: null, uploadExpiresAt: input.uploadExpiresAt,
        uploadedAt: null, processingStartedAt: null, completedAt: null,
        errorCode: null, errorMessage: null, createdAt: new Date(), updatedAt: new Date(),
      };
      return storedUpload;
    },
    async markUploadSessionFailed(input) { failedInput = input; return storedUpload; },
    async getUpload() { return options.upload || storedUpload; },
    async finalizeUploadAndQueue() {
      finalizeCalls += 1;
      if (options.finalizeResult) return options.finalizeResult;
      return {
        upload: { ...(options.upload || storedUpload), status: 'uploaded' },
        job: { id: 'job-1', status: 'queued' },
        idempotentReplay: false,
        expired: false,
      };
    },
    async listUploads() { return storedUpload ? [storedUpload] : []; },
  };

  const storageProvider = {
    getSafetyAttestation() { return options.storageAttestation || safeStorageAttestation(); },
    async createQuarantineUpload(input) {
      return {
        method: 'PUT',
        url: 'https://uploads.example.test/signed?token=ephemeral',
        headers: { 'Content-Type': input.mediaType },
        expiresAt: new Date(new Date(input.expiresAt).getTime() - 1000).toISOString(),
      };
    },
    async statQuarantineObject() { return options.stat || { exists: true, byteLength: options.upload?.declaredByteLength || 3 }; },
    async openQuarantineReadStream() {},
    async promoteQuarantineObject() {},
    async deleteQuarantineObject() { deleteCalls += 1; },
  };

  const malwareScanner = {
    getSafetyAttestation() { return safeMalwareAttestation(); },
    async scanStream() {},
  };
  const parserProvider = {
    getSafetyAttestation() { return safeParserAttestation(); },
    async parseStream() {},
  };

  const service = createAssetUploadService({
    organizationAuthorization: {
      async requireRole(organizationId, actorId, role) { roleCalls.push({ organizationId, actorId, role }); },
    },
    assetUploadRepository: repository,
    storageProvider,
    malwareScanner,
    parserProvider,
    limits: {
      maxUploadBytes: 10 * 1024 * 1024,
      uploadSessionTtlSeconds: 900,
      maxExtractedTextChars: 30000,
      maxParserSeconds: 30,
    },
  });

  return {
    service, roleCalls,
    getCreateInput: () => createInput,
    getFailedInput: () => failedInput,
    getDeleteCalls: () => deleteCalls,
    getFinalizeCalls: () => finalizeCalls,
  };
}

test('upload session uses server-generated quarantine key and does not expose storage keys', async () => {
  const harness = createHarness();
  const result = await harness.service.createUploadSession({
    organizationId: orgId,
    userId,
    input: { fileName: '../../policy.pdf', mediaType: 'application/pdf', byteLength: 2048 },
  });

  assert.equal(harness.roleCalls[0].role, 'member');
  const persisted = harness.getCreateInput();
  assert.equal(persisted.fileName, 'policy.pdf');
  assert.equal(persisted.quarantineObjectKey.startsWith(`quarantine/${orgId}/`), true);
  assert.equal(Object.prototype.hasOwnProperty.call(result.upload, 'quarantineObjectKey'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result.upload, 'cleanObjectKey'), false);
  assert.equal(result.transfer.method, 'PUT');
  assert.match(result.transfer.url, /^https:\/\//);
});

test('unsafe storage attestation prevents upload record creation', async () => {
  const harness = createHarness({ storageAttestation: { ...safeStorageAttestation(), publicReadDisabled: false } });
  await assert.rejects(
    () => harness.service.createUploadSession({
      organizationId: orgId, userId,
      input: { fileName: 'policy.pdf', mediaType: 'application/pdf', byteLength: 2048 },
    }),
    (error) => error.code === 'ASSET_STORAGE_NOT_SAFE',
  );
  assert.equal(harness.getCreateInput(), null);
});

test('finalize rejects storage size mismatch, marks upload failed and deletes quarantine object', async () => {
  const upload = {
    id: '33333333-3333-4333-8333-333333333333', organizationId: orgId,
    status: 'awaiting_upload',
    quarantineObjectKey: `quarantine/${orgId}/33333333-3333-4333-8333-333333333333`,
    declaredByteLength: 3, uploadExpiresAt: new Date(Date.now() + 60000),
  };
  const harness = createHarness({ upload, stat: { exists: true, byteLength: 4 } });
  await assert.rejects(
    () => harness.service.finalizeUpload({ organizationId: orgId, userId, uploadId: upload.id }),
    (error) => error.code === 'ASSET_UPLOAD_SIZE_MISMATCH',
  );
  assert.equal(harness.getFailedInput().errorCode, 'ASSET_UPLOAD_SIZE_MISMATCH');
  assert.equal(harness.getDeleteCalls(), 1);
  assert.equal(harness.getFinalizeCalls(), 0);
});

test('expired upload is atomically expired, creates no job and cleans quarantine', async () => {
  const upload = {
    id: '44444444-4444-4444-8444-444444444444', organizationId: orgId,
    status: 'awaiting_upload',
    quarantineObjectKey: `quarantine/${orgId}/44444444-4444-4444-8444-444444444444`,
    declaredByteLength: 3, uploadExpiresAt: new Date(Date.now() - 1000),
  };
  const expiredUpload = { ...upload, status: 'expired', errorCode: 'ASSET_UPLOAD_EXPIRED' };
  const harness = createHarness({
    upload,
    finalizeResult: { upload: expiredUpload, job: null, idempotentReplay: false, expired: true },
  });

  await assert.rejects(
    () => harness.service.finalizeUpload({ organizationId: orgId, userId, uploadId: upload.id }),
    (error) => error.code === 'ASSET_UPLOAD_EXPIRED' && error.statusCode === 410,
  );
  assert.equal(harness.getFinalizeCalls(), 1);
  assert.equal(harness.getDeleteCalls(), 1);
});

test('repository expiry race after object stat still cleans quarantine and returns 410', async () => {
  const upload = {
    id: '55555555-5555-4555-8555-555555555555', organizationId: orgId,
    status: 'awaiting_upload',
    quarantineObjectKey: `quarantine/${orgId}/55555555-5555-4555-8555-555555555555`,
    declaredByteLength: 3, uploadExpiresAt: new Date(Date.now() + 60000),
  };
  const expiredUpload = { ...upload, status: 'expired', errorCode: 'ASSET_UPLOAD_EXPIRED' };
  const harness = createHarness({
    upload,
    stat: { exists: true, byteLength: 3 },
    finalizeResult: { upload: expiredUpload, job: null, idempotentReplay: false, expired: true },
  });

  await assert.rejects(
    () => harness.service.finalizeUpload({ organizationId: orgId, userId, uploadId: upload.id }),
    (error) => error.code === 'ASSET_UPLOAD_EXPIRED' && error.statusCode === 410,
  );
  assert.equal(harness.getFinalizeCalls(), 1);
  assert.equal(harness.getDeleteCalls(), 1);
});
