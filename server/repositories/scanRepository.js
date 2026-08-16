const { HttpError } = require('../lib/httpError');
const { assertTargetSupportsModules } = require('../domain/targetScanCompatibility');
const { assertTargetVerified } = require('../domain/targetAuthorization');

function mapScanRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    targetId: row.target_id,
    requestedBy: row.requested_by,
    status: row.status,
    scannerVersion: row.scanner_version,
    contractVersion: row.contract_version,
    requestedModules: row.requested_modules,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
  };
}

function mapJobRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    scanId: row.scan_id,
    jobType: row.job_type,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at,
    leasedAt: row.leased_at,
    leaseExpiresAt: row.lease_expires_at,
    workerId: row.worker_id,
    payload: row.payload || {},
    resultSummary: row.result_summary || {},
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    createdAt: row.created_at,
  };
}

function sameStringArray(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((value, index) => value === b[index]);
}

function assertIdempotentRequestMatches(existing, input) {
  const matches =
    existing.target_id === input.targetId &&
    existing.requested_by === input.requestedBy &&
    existing.scanner_version === input.scannerVersion &&
    existing.contract_version === input.contractVersion &&
    sameStringArray(existing.requested_modules, input.requestedModules);

  if (!matches) {
    throw new HttpError(
      409,
      'Idempotency key was already used for a different scan request.',
      'IDEMPOTENCY_KEY_REUSED',
    );
  }
}

async function findExistingByIdempotency(client, organizationId, idempotencyKey) {
  if (!idempotencyKey) return null;

  const result = await client.query(
    `select id, organization_id, target_id, requested_by, status,
            scanner_version, contract_version, requested_modules,
            idempotency_key, created_at
       from public.scans
      where organization_id = $1
        and idempotency_key = $2
      limit 1
      for share`,
    [organizationId, idempotencyKey],
  );

  return result.rowCount > 0 ? result.rows[0] : null;
}

async function loadJobsForScan(client, scanId, organizationId) {
  const result = await client.query(
    `select id, organization_id, scan_id, job_type, status,
            attempt_count, max_attempts, available_at,
            leased_at, lease_expires_at, worker_id, payload,
            result_summary, completed_at, failed_at, created_at
       from public.scan_jobs
      where scan_id = $1 and organization_id = $2
      order by created_at asc, job_type asc`,
    [scanId, organizationId],
  );

  return result.rows.map(mapJobRow);
}

function createScanRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Scan repository requires a PostgreSQL pool.');
  }

  async function createQueuedScanWithJobs(input) {
    const client = await pool.connect();

    try {
      await client.query('begin');

      const targetResult = await client.query(
        `select id, organization_id, type, verification_state
           from public.targets
          where id = $1 and organization_id = $2
          for share`,
        [input.targetId, input.organizationId],
      );

      if (targetResult.rowCount === 0) {
        throw new HttpError(404, 'Target was not found in this organization.', 'TARGET_NOT_FOUND');
      }

      const target = targetResult.rows[0];
      assertTargetVerified(target);
      assertTargetSupportsModules(target.type, input.requestedModules);

      const existingBeforeInsert = await findExistingByIdempotency(
        client,
        input.organizationId,
        input.idempotencyKey,
      );

      if (existingBeforeInsert) {
        assertIdempotentRequestMatches(existingBeforeInsert, input);
        const jobs = await loadJobsForScan(client, existingBeforeInsert.id, input.organizationId);
        await client.query('commit');
        return { created: false, scan: mapScanRow(existingBeforeInsert), jobs };
      }

      const insertResult = await client.query(
        `insert into public.scans (
           organization_id,
           target_id,
           requested_by,
           status,
           scanner_version,
           contract_version,
           requested_modules,
           idempotency_key
         ) values ($1, $2, $3, 'queued', $4, $5, $6::text[], $7)
         on conflict (organization_id, idempotency_key)
           where idempotency_key is not null
         do nothing
         returning id, organization_id, target_id, requested_by, status,
                   scanner_version, contract_version, requested_modules,
                   idempotency_key, created_at`,
        [
          input.organizationId,
          input.targetId,
          input.requestedBy,
          input.scannerVersion,
          input.contractVersion,
          input.requestedModules,
          input.idempotencyKey,
        ],
      );

      if (insertResult.rowCount === 0) {
        const existingAfterConflict = await findExistingByIdempotency(
          client,
          input.organizationId,
          input.idempotencyKey,
        );

        if (!existingAfterConflict) {
          throw new HttpError(409, 'Scan request conflicted with another request.', 'SCAN_CREATE_CONFLICT');
        }

        assertIdempotentRequestMatches(existingAfterConflict, input);
        const jobs = await loadJobsForScan(client, existingAfterConflict.id, input.organizationId);
        await client.query('commit');
        return { created: false, scan: mapScanRow(existingAfterConflict), jobs };
      }

      const scanRow = insertResult.rows[0];
      const jobsResult = await client.query(
        `insert into public.scan_jobs (
           organization_id,
           scan_id,
           job_type,
           status,
           payload
         )
         select $1, $2, module_id, 'queued', '{}'::jsonb
           from unnest($3::text[]) as module_id
         returning id, organization_id, scan_id, job_type, status,
                   attempt_count, max_attempts, available_at,
                   leased_at, lease_expires_at, worker_id, payload,
                   result_summary, completed_at, failed_at, created_at`,
        [input.organizationId, scanRow.id, input.requestedModules],
      );

      await client.query('commit');
      return {
        created: true,
        scan: mapScanRow(scanRow),
        jobs: jobsResult.rows.map(mapJobRow),
      };
    } catch (error) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] Scan submission rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    createQueuedScanWithJobs,
  };
}

module.exports = {
  assertIdempotentRequestMatches,
  createScanRepository,
  mapJobRow,
  mapScanRow,
  sameStringArray,
};