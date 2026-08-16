function mapScanStatusRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    targetId: row.target_id,
    requestedBy: row.requested_by,
    status: row.status,
    scannerVersion: row.scanner_version,
    contractVersion: row.contract_version,
    requestedModules: row.requested_modules,
    overallScore: row.overall_score,
    coverage: row.coverage || {},
    notices: row.notices || [],
    startedAt: row.started_at,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapJobStatusRow(row) {
  return {
    id: row.id,
    scanId: row.scan_id,
    jobType: row.job_type,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at,
    leasedAt: row.leased_at,
    leaseExpiresAt: row.lease_expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createScanReadRepository(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('Scan read repository requires a PostgreSQL pool.');
  }

  async function getScanWithJobs(organizationId, scanId) {
    const scanResult = await pool.query(
      `select id, organization_id, target_id, requested_by, status,
              scanner_version, contract_version, requested_modules,
              overall_score, coverage, notices,
              started_at, completed_at, failed_at,
              error_code, error_message, created_at, updated_at
         from public.scans
        where organization_id = $1 and id = $2
        limit 1`,
      [organizationId, scanId],
    );

    if (scanResult.rowCount === 0) return null;

    const jobsResult = await pool.query(
      `select id, scan_id, job_type, status,
              attempt_count, max_attempts, available_at,
              leased_at, lease_expires_at, created_at, updated_at
         from public.scan_jobs
        where organization_id = $1 and scan_id = $2
        order by created_at asc, job_type asc`,
      [organizationId, scanId],
    );

    return {
      scan: mapScanStatusRow(scanResult.rows[0]),
      jobs: jobsResult.rows.map(mapJobStatusRow),
    };
  }

  return { getScanWithJobs };
}

module.exports = {
  createScanReadRepository,
  mapJobStatusRow,
  mapScanStatusRow,
};
