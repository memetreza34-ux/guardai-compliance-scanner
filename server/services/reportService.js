const { buildTechnicalReportSnapshot, REPORT_SCHEMA_VERSION } = require('../domain/reportSnapshot');
const { HttpError } = require('../lib/httpError');

function createReportService({
  organizationAuthorization,
  reportRepository,
  scanReadRepository,
}) {
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Report service requires organization authorization.');
  }
  if (!reportRepository) {
    throw new TypeError('Report service requires a Report repository.');
  }
  if (!scanReadRepository || typeof scanReadRepository.getScanWithJobs !== 'function') {
    throw new TypeError('Report service requires a Scan read repository.');
  }

  async function create({ organizationId, userId, scanId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'member');
    const scanResult = await scanReadRepository.getScanWithJobs(organizationId, scanId);
    if (!scanResult) {
      throw new HttpError(404, 'Scan was not found in this organization.', 'SCAN_NOT_FOUND');
    }

    const { snapshot, snapshotHash } = buildTechnicalReportSnapshot(scanResult);
    return reportRepository.createSnapshot({
      organizationId,
      scanId,
      schemaVersion: REPORT_SCHEMA_VERSION,
      reportType: 'technical-screening',
      snapshot,
      snapshotHash,
      createdBy: userId,
    });
  }

  async function get({ organizationId, userId, reportId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const report = await reportRepository.getSnapshot(organizationId, reportId);
    if (!report) {
      throw new HttpError(404, 'Report snapshot was not found in this organization.', 'REPORT_NOT_FOUND');
    }
    return report;
  }

  async function list({ organizationId, userId, scanId, limit, cursor }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    return reportRepository.listSnapshots({
      organizationId,
      scanId: scanId || null,
      limit,
      cursor,
    });
  }

  return { create, get, list };
}

module.exports = { createReportService };
