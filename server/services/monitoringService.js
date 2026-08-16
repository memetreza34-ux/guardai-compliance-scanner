const { HttpError } = require('../lib/httpError');
const {
  normalizeMonitorInterval,
  normalizeMonitorModule,
} = require('../domain/monitoring');

function createMonitoringService({ organizationAuthorization, monitorRepository }) {
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Monitoring service requires Organization authorization.');
  }
  if (!monitorRepository) {
    throw new TypeError('Monitoring service requires Monitor repository.');
  }

  async function create({ organizationId, userId, targetId, moduleId, scheduleMinutes }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'admin');
    return monitorRepository.createMonitor({
      organizationId,
      targetId,
      moduleId: normalizeMonitorModule(moduleId),
      scheduleMinutes: normalizeMonitorInterval(scheduleMinutes),
      createdBy: userId,
    });
  }

  async function list({ organizationId, userId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    return monitorRepository.listMonitors(organizationId);
  }

  async function changeStatus({ organizationId, userId, monitorId, status }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'admin');
    const monitor = await monitorRepository.setStatus({ organizationId, monitorId, status });
    if (!monitor) {
      throw new HttpError(404, 'Monitor was not found in this organization.', 'MONITOR_NOT_FOUND');
    }
    return monitor;
  }

  return { changeStatus, create, list };
}

module.exports = { createMonitoringService };
