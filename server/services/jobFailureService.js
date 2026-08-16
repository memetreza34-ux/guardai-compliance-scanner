const { assertWorkerId, sanitizeJobError, shouldRetryWorkerError } = require('../domain/jobLifecycle');
const { HttpError } = require('../lib/httpError');
const { assertActiveLease } = require('../repositories/jobRepository');

function createJobFailureService({ pool, jobRepository }) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Job failure service requires a PostgreSQL pool.');
  }
  if (!jobRepository || typeof jobRepository.failJob !== 'function') {
    throw new TypeError('Job failure service requires a job repository.');
  }

  async function failTerminally({ jobId, workerId, error }) {
    const normalizedWorkerId = assertWorkerId(workerId);
    const failure = sanitizeJobError(error);
    const client = await pool.connect();

    try {
      await client.query('begin');

      const locked = await client.query(
        `select j.id, j.organization_id, j.scan_id, j.job_type, j.status,
                j.worker_id, j.attempt_count, j.max_attempts,
                (j.lease_expires_at > now()) as lease_valid,
                s.status as scan_status
           from public.scan_jobs j
           join public.scans s
             on s.id = j.scan_id and s.organization_id = j.organization_id
          where j.id = $1
          for update of j, s`,
        [jobId],
      );

      if (locked.rowCount === 0) {
        throw new HttpError(404, 'Worker job was not found.', 'JOB_NOT_FOUND');
      }

      const row = locked.rows[0];
      if (row.status === 'completed' || row.status === 'failed' || row.status === 'cancelled') {
        await client.query('commit');
        return { alreadyFinalized: true, jobId: row.id, status: row.status };
      }

      assertActiveLease(row, normalizedWorkerId);

      const failedSummary = {
        state: 'error',
        attemptCount: row.attempt_count,
        maxAttempts: row.max_attempts,
        errorCode: failure.code,
        retryable: false,
      };

      await client.query(
        `update public.scan_jobs
            set status = 'failed',
                result_summary = $2::jsonb,
                failed_at = now(),
                leased_at = null,
                lease_expires_at = null,
                error_code = $3,
                error_message = $4,
                updated_at = now()
          where id = $1`,
        [row.id, JSON.stringify(failedSummary), failure.code, failure.message],
      );

      await client.query(
        `update public.scan_jobs
            set status = 'cancelled',
                leased_at = null,
                lease_expires_at = null,
                error_code = 'SCAN_ABORTED_AFTER_JOB_FAILURE',
                error_message = 'Cancelled because another requested scan module failed permanently.',
                updated_at = now()
          where scan_id = $1
            and organization_id = $2
            and id <> $3
            and status in ('queued', 'running')`,
        [row.scan_id, row.organization_id, row.id],
      );

      await client.query(
        `update public.scans
            set status = 'failed',
                failed_at = now(),
                error_code = $3,
                error_message = $4,
                coverage = jsonb_set(
                  coalesce(coverage, '{}'::jsonb),
                  array[$5]::text[],
                  $6::jsonb,
                  true
                ),
                updated_at = now()
          where id = $1
            and organization_id = $2
            and status in ('queued', 'running')`,
        [
          row.scan_id,
          row.organization_id,
          failure.code,
          failure.message,
          row.job_type,
          JSON.stringify({
            state: 'error',
            attemptCount: row.attempt_count,
            maxAttempts: row.max_attempts,
            retryable: false,
          }),
        ],
      );

      await client.query('commit');
      return {
        alreadyFinalized: false,
        retryScheduled: false,
        scanFailed: true,
        retryable: false,
      };
    } catch (caught) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] Permanent job failure rollback failed:', rollbackError);
      }
      throw caught;
    } finally {
      client.release();
    }
  }

  async function fail(input) {
    if (shouldRetryWorkerError(input.error)) {
      return jobRepository.failJob(input);
    }
    return failTerminally(input);
  }

  return {
    fail,
    failTerminally,
  };
}

module.exports = { createJobFailureService };
