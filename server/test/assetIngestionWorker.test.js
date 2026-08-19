const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const {
  executeAssetIngestion,
  processOneAssetIngestionJob,
} = require('../workers/assetIngestionWorker');

const orgId = '11111111-1111-4111-8111-111111111111';
const uploadId = '22222222-2222-4222-8222-222222222222';
const jobId = '33333333-3333-4333-8333-333333333333';
const quarantineKey = `quarantine/${orgId}/${uploadId}`;
const cleanKey = `assets/${orgId}/${uploadId}`;

function safeAttestations() {
  return {
    storage: {
      providerId: 'test-storage',
      privateByDefault: true,
      publicReadDisabled: true,
      executableServingDisabled: true,
      serverSideEncryption: true,
      boundedUploadPolicy: true,
      organizationObjectKeyIsolation: true,
      quarantineLifecycleConfigured: true,
      cleanObjectLifecycleConfigured: true,
      promotionIsIdempotentCopy: true,
    },
    malware: {
      engineId: 'test-malware',
      engineVersion: '1.0.0',
      isolatedExecution: true,
      failClosedOnScannerError: true,
      signatureVersionReported: true,
      noPublicArtifactAccess: true,
    },
    parser: {
      parserId: 'test-parser',
      parserVersion: '1.0.0',
      isolatedExecution: true,
      networkDisabled: true,
      ephemeralFilesystem: true,
      resourceLimitsEnforced: true,
      outputLimitEnforced: true,
    },
  };
}

function contextForText(text) {
  return {
    jobId,
    organizationId: orgId,
    uploadId,
    pipelineVersion: '0.1.0',
    quarantineObjectKey: quarantineKey,
    fileName: 'policy.txt',
    declaredMediaType: 'text/plain',
    declaredByteLength: Buffer.byteLength(text),
    uploadExpiresAt: new Date(Date.now() + 60000),
  };
}

const limits = {
  maxUploadBytes: 1024 * 1024,
  uploadSessionTtlSeconds: 900,
  maxExtractedTextChars: 30000,
  maxParserSeconds: 30,
};

test('clean asset execution discards extracted text before returning persistence payload', async () => {
  const rawText = 'very private parsed customer text';
  const context = contextForText('source document');
  let promotionInput = null;
  const result = await executeAssetIngestion(context, {
    storageProvider: {
      async openQuarantineReadStream() {
        return Readable.from([Buffer.from('source document')]);
      },
      async promoteQuarantineObject(input) {
        promotionInput = input;
        return { objectKey: input.destinationObjectKey, sha256: input.expectedSha256 };
      },
    },
    malwareScanner: {
      async scanQuarantineObject() {
        return { verdict: 'clean', signatureVersion: 'sig-1' };
      },
    },
    parserProvider: {
      async parseQuarantineObject() {
        return { text: rawText, pageCount: 1 };
      },
    },
    attestations: safeAttestations(),
    limits,
  });

  assert.equal(result.outcome, 'clean');
  assert.equal(result.cleanObjectKey, cleanKey);
  assert.equal(Object.prototype.hasOwnProperty.call(result.parser, 'text'), false);
  assert.equal(JSON.stringify(result).includes(rawText), false);
  assert.equal(promotionInput.destinationObjectKey, cleanKey);
  assert.equal(promotionInput.expectedSha256, result.observed.sha256);
});

test('infected asset execution never calls parser or clean-object promotion', async () => {
  const context = contextForText('infected sample');
  let parserCalls = 0;
  let promotionCalls = 0;
  const result = await executeAssetIngestion(context, {
    storageProvider: {
      async openQuarantineReadStream() {
        return Readable.from([Buffer.from('infected sample')]);
      },
      async promoteQuarantineObject() {
        promotionCalls += 1;
      },
    },
    malwareScanner: {
      async scanQuarantineObject() {
        return { verdict: 'infected', signatureVersion: 'sig-2' };
      },
    },
    parserProvider: {
      async parseQuarantineObject() {
        parserCalls += 1;
        return { text: 'must never happen' };
      },
    },
    attestations: safeAttestations(),
    limits,
  });

  assert.equal(result.outcome, 'infected');
  assert.equal(parserCalls, 0);
  assert.equal(promotionCalls, 0);
});

test('unsafe asset runtime fails before customer job claim', async () => {
  let claimCalls = 0;
  await assert.rejects(
    () => processOneAssetIngestionJob({
      repository: {
        async claimNextJob() {
          claimCalls += 1;
          return null;
        },
      },
      storageProvider: {
        getSafetyAttestation() {
          return { ...safeAttestations().storage, publicReadDisabled: false };
        },
        async createQuarantineUpload() {},
        async statQuarantineObject() {},
        async openQuarantineReadStream() {},
        async promoteQuarantineObject() {},
        async deleteQuarantineObject() {},
      },
      malwareScanner: {
        getSafetyAttestation() { return safeAttestations().malware; },
        async scanQuarantineObject() {},
      },
      parserProvider: {
        getSafetyAttestation() { return safeAttestations().parser; },
        async parseQuarantineObject() {},
      },
      workerId: 'asset-worker-1',
      limits,
    }),
    (error) => error.code === 'ASSET_STORAGE_NOT_SAFE',
  );
  assert.equal(claimCalls, 0);
});

test('clean worker completion receives only minimized parser provenance and cleans quarantine after DB completion', async () => {
  const sourceText = 'source document';
  const events = [];
  let completionInput = null;
  const repository = {
    async claimNextJob() {
      events.push('claim');
      return { id: jobId, uploadId, organizationId: orgId };
    },
    async getExecutionContext() {
      events.push('context');
      return contextForText(sourceText);
    },
    async renewLease() {},
    async completeClean(input) {
      events.push('complete');
      completionInput = input;
      return { targetId: '44444444-4444-4444-8444-444444444444' };
    },
    async completeInfected() {
      throw new Error('unexpected infected completion');
    },
    async failJob() {
      throw new Error('unexpected failure');
    },
  };
  const storageProvider = {
    getSafetyAttestation() { return safeAttestations().storage; },
    async createQuarantineUpload() {},
    async statQuarantineObject() {},
    async openQuarantineReadStream() {
      return Readable.from([Buffer.from(sourceText)]);
    },
    async promoteQuarantineObject(input) {
      events.push('promote');
      return { objectKey: input.destinationObjectKey, sha256: input.expectedSha256 };
    },
    async deleteQuarantineObject() {
      events.push('delete');
    },
  };
  const result = await processOneAssetIngestionJob({
    repository,
    storageProvider,
    malwareScanner: {
      getSafetyAttestation() { return safeAttestations().malware; },
      async scanQuarantineObject() { return { verdict: 'clean', signatureVersion: 'sig-3' }; },
    },
    parserProvider: {
      getSafetyAttestation() { return safeAttestations().parser; },
      async parseQuarantineObject() { return { text: 'private parser output', pageCount: 2 }; },
    },
    workerId: 'asset-worker-1',
    leaseSeconds: 90,
    limits,
  });

  assert.equal(result.state, 'clean');
  assert.equal(Object.prototype.hasOwnProperty.call(completionInput.parser, 'text'), false);
  assert.equal(JSON.stringify(completionInput).includes('private parser output'), false);
  assert.deepEqual(events.slice(-3), ['promote', 'complete', 'delete']);
});
