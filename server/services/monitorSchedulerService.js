const { HttpError } = require('../lib/httpError');
const {
  MONITOR_MODULE,
  monitorScanIdempotencyKey,
} = require('../domain/monitoring');

function createMonitorSchedulerService({
  monitorRepository,
  scanRepository,
  scannerVersion,
  contractVersion,
}) {
  if (!monitorRepository) throw new TypeError('Monitor scheduler requires Monitor repository.');
  if (!scanRepository || typeof scanRepository.createQueuedScanWithJobs !== 'function') {
    throw new TypeError('Monitor scheduler requires Scan repository.');
  }

  async function scheduleOne({ workerId, leaseSeconds = 60 }) {
    const claim = await monitorRepository.claimDueMonitor({ workerId, leaseSeconds });
    if (!claim) return { state: 'idle' };
    if (claim.paused) {
      return {
        state: 'paused',
        monitorId: claim.monitor.id,
        reason: claim.reason,
      };
    }

    const { monitor, scheduledFor } = claim;
    try {
      const result = await scanRepository.createQueuedScanWithJobs({
        organizationId: monitor.organizationId,
        targetId: monitor.targetId,
        requestedBy: monitor.createdBy,
        requestedModules: [MONITOR_MODULE],
        scannerVersion,
        contractVersion,
        idempotencyKey: monitorScanIdempotencyKey(monitor.id, scheduledFor),
      });

      const completed = await monitorRepository.completeScheduledRun({
        monitorId: monitor.id,
        workerId,
        scheduledFor,
        scanId: result.scan.id,
      });
      return {
        state: 'scheduled',
        monitorId: monitor.id,
        scanId: result.scan.id,
        scanCreated: result.created,
        scheduledFor,
        nextRunAt: completed.nextRunAt,
      };
    } catch (error) {
      if (
        error instanceof HttpError &&
        ['TARGET_NOT_VERIFIED', 'MONITOR_TARGET_NOT_ELIGIBLE'].includes(error.code)
      ) {
        await monitorRepository.setStatus({
          organizationId: monitor.organizationId,
          monitorId: monitor.id,
          status: 'paused',
        });
        return {
          state: 'paused',
          monitorId: monitor.id,
          reason: 'target_not_verified',
        };
      }

      await monitorRepository.releaseLease({ monitorId: monitor.id, workerId });
      throw error;
    }
  }

  return { scheduleOne };
}

module.exports = { createMonitorSchedulerService };
