const os = require('node:os');
const { setTimeout: delay } = require('node:timers/promises');
const { config } = require('../config');
const { closePostgresPool } = require('../database/postgres');
const { assertLeaseSeconds, assertWorkerId } = require('../domain/jobLifecycle');
const { getPersistenceServices } = require('../services/persistenceServices');
const { processOneSecurityJob } = require('./securityWorker');

function createWorkerId() {
  const hostname = os.hostname().replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 80) || 'host';
  return assertWorkerId(`security:${hostname}:${process.pid}`);
}

function assertWorkerConfig() {
  assertLeaseSeconds(config.workerLeaseSeconds);
  if (!Number.isInteger(config.workerPollMs) || config.workerPollMs < 100 || config.workerPollMs > 60000) {
    throw new Error('WORKER_POLL_MS must be an integer between 100 and 60000.');
  }
}

async function runSecurityWorkerProcess({ once = false } = {}) {
  assertWorkerConfig();
  const workerId = createWorkerId();
  const { jobRepository } = getPersistenceServices();
  let stopping = false;

  const requestStop = () => {
    stopping = true;
  };

  process.once('SIGTERM', requestStop);
  process.once('SIGINT', requestStop);

  try {
    do {
      try {
        const result = await processOneSecurityJob({
          jobRepository,
          workerId,
          leaseSeconds: config.workerLeaseSeconds,
        });

        if (result.state === 'idle') {
          if (!once && !stopping) await delay(config.workerPollMs);
        } else {
          console.log(`[SecurityWorker] ${result.state} job=${result.jobId} scan=${result.scanId}`);
        }
      } catch (error) {
        console.error('[SecurityWorker] Worker loop error:', error?.code || error?.message || 'unknown');
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
  runSecurityWorkerProcess({ once }).catch((error) => {
    console.error('[SecurityWorker] Fatal:', error?.code || error?.message || 'unknown');
    process.exitCode = 1;
  });
}

module.exports = {
  assertWorkerConfig,
  createWorkerId,
  runSecurityWorkerProcess,
};