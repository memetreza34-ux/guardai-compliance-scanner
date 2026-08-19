const os = require('node:os');
const { setTimeout: delay } = require('node:timers/promises');
const { assertAssetPipelineProviders } = require('../asset/assetPipelineContract');
const { getAssetRuntimeProviders } = require('../asset/runtimeProviders');
const { config } = require('../config');
const { closePostgresPool } = require('../database/postgres');
const { assertLeaseSeconds, assertWorkerId } = require('../domain/jobLifecycle');
const { assertSafeRuntimeConfiguration } = require('../lib/runtimeSafety');
const { assetLimitsFromConfig, getPersistenceServices } = require('../services/persistenceServices');
const { processOneAssetIngestionJob } = require('./assetIngestionWorker');

function createWorkerId() {
  const hostname = os.hostname().replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 80) || 'host';
  return assertWorkerId(`asset:${hostname}:${process.pid}`);
}

function assertAssetWorkerConfig(providers = getAssetRuntimeProviders()) {
  assertSafeRuntimeConfiguration();
  if (config.assetPipelineEnabled !== true) {
    const error = new Error('ASSET_PIPELINE_ENABLED must be true before the Asset Worker can start.');
    error.code = 'ASSET_PIPELINE_DISABLED';
    throw error;
  }
  assertLeaseSeconds(config.assetWorkerLeaseSeconds);
  if (!Number.isInteger(config.workerPollMs) || config.workerPollMs < 100 || config.workerPollMs > 60000) {
    throw new Error('WORKER_POLL_MS must be an integer between 100 and 60000.');
  }
  const attestations = assertAssetPipelineProviders(providers);
  return { providers, attestations };
}

async function runAssetIngestionWorkerProcess({ once = false, providers: suppliedProviders } = {}) {
  const providers = suppliedProviders || getAssetRuntimeProviders();
  assertAssetWorkerConfig(providers);
  const workerId = createWorkerId();
  const { assetIngestionRepository } = getPersistenceServices();
  let stopping = false;

  const requestStop = () => { stopping = true; };
  process.once('SIGTERM', requestStop);
  process.once('SIGINT', requestStop);

  try {
    do {
      try {
        const result = await processOneAssetIngestionJob({
          repository: assetIngestionRepository,
          ...providers,
          workerId,
          leaseSeconds: config.assetWorkerLeaseSeconds,
          limits: assetLimitsFromConfig(),
        });

        if (result.state === 'idle') {
          if (!once && !stopping) await delay(config.workerPollMs);
        } else {
          console.log(`[AssetWorker] ${result.state} job=${result.jobId}`);
        }
      } catch (error) {
        console.error('[AssetWorker] Worker loop error:', error?.code || error?.message || 'unknown');
        if (once) throw error;
        if (!stopping) await delay(config.workerPollMs);
      }
    } while (!once && !stopping);
  } finally {
    process.removeListener('SIGTERM', requestStop);
    process.removeListener('SIGINT', requestStop);
    await closePostgresPool();
  }
}

if (require.main === module) {
  const once = process.argv.includes('--once');
  runAssetIngestionWorkerProcess({ once }).catch((error) => {
    console.error('[AssetWorker] Fatal:', error?.code || error?.message || 'unknown');
    process.exitCode = 1;
  });
}

module.exports = {
  assertAssetWorkerConfig,
  createWorkerId,
  runAssetIngestionWorkerProcess,
};
