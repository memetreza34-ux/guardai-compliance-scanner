const os = require('node:os');
const { setTimeout: delay } = require('node:timers/promises');
const { closePostgresPool } = require('../database/postgres');
const { assertWorkerId } = require('../domain/jobLifecycle');
const { getMonitoringPersistenceServices } = require('../services/monitoringPersistence');

const SCHEDULER_POLL_MS = 5000;
const SCHEDULER_LEASE_SECONDS = 60;

function createSchedulerWorkerId() {
  const hostname = os.hostname().replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 80) || 'host';
  return assertWorkerId(`monitor:${hostname}:${process.pid}`);
}

async function runMonitorSchedulerProcess({ once = false } = {}) {
  const workerId = createSchedulerWorkerId();
  const { monitorSchedulerService } = getMonitoringPersistenceServices();
  let stopping = false;

  const requestStop = () => {
    stopping = true;
  };
  process.once('SIGTERM', requestStop);
  process.once('SIGINT', requestStop);

  try {
    do {
      try {
        const result = await monitorSchedulerService.scheduleOne({
          workerId,
          leaseSeconds: SCHEDULER_LEASE_SECONDS,
        });
        if (result.state === 'idle') {
          if (!once && !stopping) await delay(SCHEDULER_POLL_MS);
        } else {
          console.log(JSON.stringify({
            event: 'monitor_scheduler_tick',
            state: result.state,
            monitorId: result.monitorId,
            scanId: result.scanId || null,
            reason: result.reason || null,
          }));
        }
      } catch (error) {
        console.error(JSON.stringify({
          event: 'monitor_scheduler_error',
          code: error?.code || 'MONITOR_SCHEDULER_ERROR',
          message: error?.message || 'Monitor scheduler failed',
        }));
        if (once) throw error;
        if (!stopping) await delay(SCHEDULER_POLL_MS);
      }
    } while (!once && !stopping);
  } finally {
    process.removeListener('SIGTERM', requestStop);
    process.removeListener('SIGINT', requestStop);
    await closePostgresPool();
  }
}

if (require.main === module) {
  runMonitorSchedulerProcess({ once: process.argv.includes('--once') }).catch((error) => {
    console.error('[MonitorScheduler] Fatal:', error?.code || error?.message || 'unknown');
    process.exitCode = 1;
  });
}

module.exports = {
  createSchedulerWorkerId,
  runMonitorSchedulerProcess,
  SCHEDULER_LEASE_SECONDS,
  SCHEDULER_POLL_MS,
};
