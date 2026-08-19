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
    scoringProfileId: row.scoring_profile_id,
    scoringProfileVersion: row.scoring_profile_version,
    targetSnapshot: row.target_snapshot || null,
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
    resultSummary: row.result_summary || {},
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEvidenceRow(row) {
  return {
    id: row.id,
    detectorId: row.detector_id,
    detectorVersion: row.detector_version,
    type: row.type,
    source: row.source,
    normalizedData: row.normalized_data || {},
    contentHash: row.content_hash,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
  };
}

function mapFindingRow(row) {
  return {
    findingId: row.finding_id,
    fingerprint: row.fingerprint,
    ruleId: row.rule_id,
    ruleVersion: row.rule_version,
    ruleDefinitionHash: row.rule_definition_hash,
    status: row.finding_status,
    severity: row.severity,
    confidence: row.confidence,
    evidenceIds: row.evidence_ids || [],
    message: row.message,
    remediation: row.remediation,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    instanceCreatedAt: row.instance_created_at,
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
              scoring_profile_id, scoring_profile_version, target_snapshot,
              overall_score, coverage, notices,
              started_at, completed_at, failed_at,
              error_code, error_message, created_at, updated_at
         from public.scans
        where organization_id = $1 and id = $2
        limit 1`,
      [organizationId, scanId],
    );

    if (scanResult.rowCount === 0) return null;

    const [jobsResult, evidenceResult, findingsResult] = await Promise.all([
      pool.query(
        `select id, scan_id, job_type, status,
                attempt_count, max_attempts, available_at,
                leased_at, lease_expires_at, result_summary,
                completed_at, failed_at, error_code, error_message,
                created_at, updated_at
           from public.scan_jobs
          where organization_id = $1 and scan_id = $2
          order by created_at asc, job_type asc`,
        [organizationId, scanId],
      ),
      pool.query(
        `select id, detector_id, detector_version, type, source,
                normalized_data, content_hash, captured_at, created_at
           from public.evidence
          where organization_id = $1 and scan_id = $2
          order by captured_at asc, id asc`,
        [organizationId, scanId],
      ),
      pool.query(
        `select f.id as finding_id,
                f.fingerprint,
                f.status as finding_status,
                f.first_seen_at,
                f.last_seen_at,
                fi.rule_id,
                fi.rule_version,
                fi.rule_definition_hash,
                fi.severity,
                fi.confidence,
                fi.evidence_ids,
                fi.message,
                fi.remediation,
                fi.created_at as instance_created_at
           from public.finding_instances fi
           join public.findings f
             on f.id = fi.finding_id
            and f.organization_id = fi.organization_id
          where fi.organization_id = $1
            and fi.scan_id = $2
          order by fi.created_at asc, f.id asc`,
        [organizationId, scanId],
      ),
    ]);

    return {
      scan: mapScanStatusRow(scanResult.rows[0]),
      jobs: jobsResult.rows.map(mapJobStatusRow),
      evidence: evidenceResult.rows.map(mapEvidenceRow),
      findings: findingsResult.rows.map(mapFindingRow),
    };
  }

  return { getScanWithJobs };
}

module.exports = {
  createScanReadRepository,
  mapEvidenceRow,
  mapFindingRow,
  mapJobStatusRow,
  mapScanStatusRow,
};
