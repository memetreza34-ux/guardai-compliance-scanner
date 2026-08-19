const { setTimeout: delay } = require('node:timers/promises');
const {
  assertAssetPipelineProviders,
  DEFAULT_ASSET_LIMITS,
  normalizeAssetLimits,
} = require('../asset/assetPipelineContract');
const { buildAssetObjectKeys } = require('../domain/assetObjectKeys');
const {
  assertObservedAssetMetadata,
  hashAndSniffAssetStream,
  normalizeMalwareVerdict,
  normalizeParserResult,
} = require('../domain/assetUpload');
const { shouldRetryWorkerError } = require('../domain/jobLifecycle');
const { HttpError } = require('../lib/httpError');

function startAssetLeaseHeartbeat({ repository, jobId, workerId, leaseSeconds }) {
  const controller = new AbortController();
  let heartbeatError = null;
  const intervalMs = Math.max(5000, Math.min(30000, Math.floor((leaseSeconds * 1000) / 3)));
  const promise = (async () => {
    while (!controller.signal.aborted) {
      try {
        await delay(intervalMs, undefined, { signal: controller.signal });
      } catch (error) {
        if (error?.name === 'AbortError') break;
        heartbeatError = error;
        break;
      }
      if (controller.signal.aborted) break;
      try {
        await repository.renewLease({ jobId, workerId, leaseSeconds });
      } catch (error) {
        heartbeatError = error;
        break;
      }
    }
  })();

  return {
    async stop() {
      controller.abort();
      try {
        await promise;
      } catch (error) {
        if (error?.name !== 'AbortError' && !heartbeatError) heartbeatError = error;
      }
      return heartbeatError;
    },
    getError() { return heartbeatError; },
  };
}

function assertPromotionResult(result, expected) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new HttpError(502, 'Asset storage promotion returned an invalid result.', 'ASSET_STORAGE_PROMOTION_INVALID');
  }
  if (result.objectKey !== expected.objectKey) {
    throw new HttpError(502, 'Asset storage promotion returned an unexpected object key.', 'ASSET_STORAGE_PROMOTION_INVALID');
  }
  if (result.sha256 !== undefined && String(result.sha256).toLowerCase() !== expected.sha256) {
    throw new HttpError(502, 'Asset storage promotion SHA-256 does not match verified content.', 'ASSET_STORAGE_PROMOTION_INVALID');
  }
  return { objectKey: result.objectKey, sha256: expected.sha256 };
}

async function openVerifiedAssetStream(storageProvider, context) {
  const stream = await storageProvider.openQuarantineReadStream({
    organizationId: context.organizationId,
    objectKey: context.quarantineObjectKey,
  });
  if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') {
    throw new HttpError(502, 'Asset storage provider returned an invalid private read stream.', 'ASSET_STORAGE_READ_STREAM_INVALID');
  }
  return stream;
}

async function executeAssetIngestion(context, {
  storageProvider,
  malwareScanner,
  parserProvider,
  attestations,
  limits,
}) {
  const verificationStream = await openVerifiedAssetStream(storageProvider, context);
  const observedRaw = await hashAndSniffAssetStream(verificationStream, limits.maxUploadBytes);
  const observed = assertObservedAssetMetadata({
    declared: {
      fileName: context.fileName,
      mediaType: context.declaredMediaType,
      byteLength: context.declaredByteLength,
    },
    observed: observedRaw,
  });

  const malwareStream = await openVerifiedAssetStream(storageProvider, context);
  const malware = normalizeMalwareVerdict(
    await malwareScanner.scanStream({
      contentStream: malwareStream,
      expectedSha256: observed.sha256,
      mediaType: observed.detectedMediaType,
      byteLength: observed.actualByteLength,
      maxBytes: limits.maxUploadBytes,
    }),
    attestations.malware,
  );

  if (malware.verdict === 'infected') {
    return { outcome: 'infected', observed, malware };
  }

  const parserStream = await openVerifiedAssetStream(storageProvider, context);
  const parserResult = normalizeParserResult(
    await parserProvider.parseStream({
      contentStream: parserStream,
      mediaType: observed.detectedMediaType,
      expectedSha256: observed.sha256,
      byteLength: observed.actualByteLength,
      maxBytes: limits.maxUploadBytes,
      maxExtractedTextChars: limits.maxExtractedTextChars,
      timeoutSeconds: limits.maxParserSeconds,
    }),
    attestations.parser,
    limits,
  );
  const {
    text: _discardedExtractedText,
    ...parser
  } = parserResult;

  const keys = buildAssetObjectKeys(context.organizationId, context.uploadId);
  if (keys.quarantineObjectKey !== context.quarantineObjectKey) {
    throw new HttpError(500, 'Asset quarantine object-key provenance mismatch.', 'ASSET_OBJECT_KEY_PROVENANCE_INVALID');
  }
  const promotion = assertPromotionResult(
    await storageProvider.promoteQuarantineObject({
      organizationId: context.organizationId,
      sourceObjectKey: context.quarantineObjectKey,
      destinationObjectKey: keys.cleanObjectKey,
      expectedSha256: observed.sha256,
      mediaType: observed.detectedMediaType,
    }),
    { objectKey: keys.cleanObjectKey, sha256: observed.sha256 },
  );

  return {
    outcome: 'clean',
    observed,
    malware,
    parser,
    cleanObjectKey: promotion.objectKey,
  };
}

async function processOneAssetIngestionJob({
  repository,
  storageProvider,
  malwareScanner,
  parserProvider,
  workerId,
  leaseSeconds = 90,
  limits = DEFAULT_ASSET_LIMITS,
}) {
  if (!repository) throw new TypeError('Asset ingestion Worker requires repository.');
  const normalizedLimits = normalizeAssetLimits(limits);

  // Fail before claiming customer work if any isolation/provider contract is unsafe.
  const attestations = assertAssetPipelineProviders({ storageProvider, malwareScanner, parserProvider });
  const job = await repository.claimNextJob({ workerId, leaseSeconds });
  if (!job) return { state: 'idle' };

  const heartbeat = startAssetLeaseHeartbeat({ repository, jobId: job.id, workerId, leaseSeconds });
  let stopped = false;
  async function stopHeartbeat() {
    if (stopped) return heartbeat.getError();
    stopped = true;
    return heartbeat.stop();
  }

  let context = null;
  try {
    context = await repository.getExecutionContext({ jobId: job.id, workerId });
    const result = await executeAssetIngestion(context, {
      storageProvider,
      malwareScanner,
      parserProvider,
      attestations,
      limits: normalizedLimits,
    });

    const heartbeatError = await stopHeartbeat();
    if (heartbeatError) throw heartbeatError;

    let completion;
    if (result.outcome === 'infected') {
      completion = await repository.completeInfected({
        jobId: job.id,
        workerId,
        observed: result.observed,
        malware: result.malware,
      });
    } else {
      completion = await repository.completeClean({
        jobId: job.id,
        workerId,
        observed: result.observed,
        malware: result.malware,
        parser: result.parser,
        cleanObjectKey: result.cleanObjectKey,
      });
    }

    await storageProvider.deleteQuarantineObject({
      organizationId: context.organizationId,
      objectKey: context.quarantineObjectKey,
    }).catch((error) => {
      console.error('[Asset Worker] Quarantine cleanup failed:', error?.message || error);
    });

    return { state: result.outcome, jobId: job.id, completion };
  } catch (error) {
    const heartbeatError = await stopHeartbeat();
    if (heartbeatError) throw heartbeatError;

    const retryable = shouldRetryWorkerError(error);
    const failure = await repository.failJob({
      jobId: job.id,
      workerId,
      error,
      retryable,
    });
    if (!failure.retryScheduled && context) {
      await storageProvider.deleteQuarantineObject({
        organizationId: context.organizationId,
        objectKey: context.quarantineObjectKey,
      }).catch((cleanupError) => {
        console.error('[Asset Worker] Failed-upload cleanup failed:', cleanupError?.message || cleanupError);
      });
    }
    return {
      state: failure.retryScheduled ? 'retrying' : 'failed',
      jobId: job.id,
      failure,
    };
  } finally {
    await stopHeartbeat();
  }
}

module.exports = {
  assertPromotionResult,
  executeAssetIngestion,
  openVerifiedAssetStream,
  processOneAssetIngestionJob,
  startAssetLeaseHeartbeat,
};
