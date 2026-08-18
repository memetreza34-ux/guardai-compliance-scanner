const os = require('node:os');
const { setTimeout: delay } = require('node:timers/promises');
const { config } = require('../config');
const { closePostgresPool } = require('../database/postgres');
const { assertLeaseSeconds, assertWorkerId } = require('../domain/jobLifecycle');
const { assertSafeRuntimeConfiguration } = require('../lib/runtimeSafety');
const { getGitHubIntegrationPersistenceServices } = require('../services/githubIntegrationPersistence');
const { getPersistenceServices } = require('../services/persistenceServices');
const { processOneRepositoryJob } = require('./repositoryWorker');

function createWorkerId() {
  const hostname = os.hostname().replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 80) || 'host';
  return assertWorkerId(`repository:${hostname}:${process.pid}`);
}

function assertWorkerConfig() {
  assertSafeRuntimeConfiguration();
  assertLeaseSeconds(config.workerLeaseSeconds);
  if (!Number.isInteger(config.workerPollMs) || config.workerPollMs < 100 || config.workerPollMs > 60000) {
    throw new Error('WORKER_POLL_MS must be an integer between 100 and 60000.');
  }
}

async function runRepositoryWorkerProcess({ once = false } = {}) {
  assertWorkerConfig();
  const workerId = createWorkerId();
  const { jobFailureService, jobRepository } = getPersistenceServices();
  const {
    githubProvider,
    githubRepository,
    targetRepository,
  } = getGitHubIntegrationPersistenceServices();
  let stopping = false;

  const requestStop = () => {
    stopping = true;
  };

  process.once('SIGTERM', requestStop);
  process.once('SIGINT', requestStop);

  try {
    do {
      try {
        const result = await processOneRepositoryJob({
          jobFailureService,
          jobRepository,
          githubProvider,
          githubRepository,
          targetRepository,
          workerId,
          leaseSeconds: config.workerLeaseSeconds,
        });

        if (result.state === 'idle') {
          if (!once && !stopping) await delay(config.workerPollMs);
        } else {
          console.log(`[RepositoryWorker] ${result.state} job=${result.jobId} scan=${result.scanId}`);
        }
      } catch (error) {
        console.error('[RepositoryWorker] Worker loop error:', error?.code || error?.message || 'unknown');
        if (!once && !stopping) await delay(config.workerPollMs);
        if (once) throw error;
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
  runRepositoryWorkerProcess({ once }).catch((error) => {
    console.error('[RepositoryWorker] Fatal:', error?.code || error?.message || 'unknown');
    process.exitCode = 1;
  });
}

module.exports = {
  assertWorkerConfig,
  createWorkerId,
  runRepositoryWorkerProcess,
};
