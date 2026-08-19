const { HttpError } = require('../lib/httpError');
const { normalizeAssessmentResult } = require('../domain/assessmentResult');
const {
  assertLeaseSeconds,
  assertWorkerId,
  calculateRetryDelaySeconds,
  sanitizeJobError,
} = require('../domain/jobLifecycle');
const { computeWeightedScanScore, getScoringProfile } = require('../domain/scoringPolicy');
const { REQUESTABLE_SCAN_MODULES } = require('../domain/scanSubmission');
const {
  createFindingFingerprint,
  hashEvidence,
} = require('../lib/evidenceIntegrity');
const { mapJobRow } = require('./scanRepository');

function normalizeWorkerJobTypes(jobTypes) {
  if (!Array.isArray(jobTypes) || jobTypes.length === 0) {
    throw new HttpError(400, 'Worker must declare at least one supported job type.', 'WORKER_JOB_TYPES_REQUIRED');
  }

  const unique = [...new Set(jobTypes)];
  const invalid = unique.filter((jobType) => !REQUESTABLE_SCAN_MODULES.includes(jobType));
  if (invalid.length > 0) {
    throw new HttpError(400, 'Worker declared an unsupported job type.', 'INVALID_WORKER_JOB_TYPE', { invalid });
  }

  return unique;
}

function assertActiveLease(row, workerId) {
  if (
    row.status !== 'running' ||
    row.worker_id !== workerId ||
    row.lease_valid !== true ||
    row.scan_status !== 'running'
  ) {
    throw new HttpError(
      409,
      'Worker no longer owns an active lease for this job.',
      'JOB_LEASE_LOST',
    );
  }
}

async function rollbackQuietly(client, label) {
  try {
    await client.query('rollback');
  } catch (error) {
    console.error(`[Database] ${label} rollback failed:`, error);
  }
}

function createJobRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Job repository requires a PostgreSQL pool.');
  }

  async function claimNextJob({ workerId, jobTypes, leaseSeconds = 60 }) {
    const normalizedWorkerId = assertWorkerId(workerId);
    const normalizedJobTypes = normalizeWorkerJobTypes(jobTypes);
    assertLeaseSeconds(leaseSeconds);

    const client = await pool.connect();
    try {
      await client.query('begin');

      const candidate = await client.query(
        `select j.id, j.organization_id, j.scan_id, j.job_type, j.status,
                j.attempt_count, j.max_attempts, j.available_at,
                j.leased_at, j.lease_expires_at, j.worker_id, j.payload,
                j.result_summary, j.completed_at, j.failed_at, j.created_at
           from public.scan_jobs j
           join public.scans s
             on s.id = j.scan_id and s.organization_id = j.organization_id
          where j.job_type = any($1::text[])
            and s.status in ('queued', 'running')
            and j.attempt_count < j.max_attempts
            and (
              (j.status = 'queued' and j.available_at <= now())
              or
              (j.status = 'running' and j.lease_expires_at is not null and j.lease_expires_at <= now())
            )
          order by j.available_at asc, j.created_at asc
          for update of j skip locked
          limit 1`,
        [normalizedJobTypes],
      );

      if (candidate.rowCount === 0) {
        await client.query('commit');
        return null;
      }

      const job = candidate.rows[0];
      const leased = await client.query(
        `update public.scan_jobs
            set status = 'running',
                attempt_count = attempt_count + 1,
                leased_at = now(),
                lease_expires_at = now() + ($2 * interval '1 second'),
                worker_id = $3,
                error_code = null,
                error_message = null,
                failed_at = null,
                updated_at = now()
          where id = $1
          returning id, organization_id, scan_id, job_type, status,
                    attempt_count, max_attempts, available_at,
                    leased_at, lease_expires_at, worker_id, payload,
                    result_summary, completed_at, failed_at, created_at`,
        [job.id, leaseSeconds, normalizedWorkerId],
      );

      await client.query(
        `update public.scans
            set status = 'running',
                started_at = coalesce(started_at, now()),
                updated_at = now()
          where id = $1
            and organization_id = $2
            and status = 'queued'`,
        [job.scan_id, job.organization_id],
      );

      await client.query('commit');
      return mapJobRow(leased.rows[0]);
    } catch (error) {
      await rollbackQuietly(client, 'Job claim');
      throw error;
    } finally {
      client.release();
    }
  }

  async function getExecutionContext({ jobId, workerId }) {
    const normalizedWorkerId = assertWorkerId(workerId);
    const result = await pool.query(
      `select j.id as job_id,
              j.organization_id,
              j.scan_id,
              j.job_type,
              j.status,
              j.worker_id,
              (j.lease_expires_at > now()) as lease_valid,
              s.status as scan_status,
              s.target_id,
              s.scanner_version,
              s.contract_version,
              t.type as target_type,
              t.canonical_url,
              t.display_name,
              t.verification_state
         from public.scan_jobs j
         join public.scans s
           on s.id = j.scan_id and s.organization_id = j.organization_id
         join public.targets t
           on t.id = s.target_id and t.organization_id = s.organization_id
        where j.id = $1
        limit 1`,
      [jobId],
    );

    if (result.rowCount === 0) {
      throw new HttpError(404, 'Worker job was not found.', 'JOB_NOT_FOUND');
    }

    const row = result.rows[0];
    assertActiveLease(row, normalizedWorkerId);

    if (row.verification_state !== 'verified') {
      throw new HttpError(409, 'Target verification is no longer valid.', 'TARGET_VERIFICATION_LOST');
    }

    return {
      jobId: row.job_id,
      organizationId: row.organization_id,
      scanId: row.scan_id,
      jobType: row.job_type,
      targetId: row.target_id,
      targetType: row.target_type,
      targetUrl: row.canonical_url,
      targetDisplayName: row.display_name,
      scannerVersion: row.scanner_version,
      contractVersion: row.contract_version,
    };
  }

  async function renewLease({ jobId, workerId, leaseSeconds = 60 }) {
    const normalizedWorkerId = assertWorkerId(workerId);
    assertLeaseSeconds(leaseSeconds);

    const result = await pool.query(
      `update public.scan_jobs j
          set lease_expires_at = now() + ($3 * interval '1 second'),
              updated_at = now()
        where j.id = $1
          and j.worker_id = $2
          and j.status = 'running'
          and j.lease_expires_at > now()
          and exists (
            select 1 from public.scans s
             where s.id = j.scan_id
               and s.organization_id = j.organization_id
               and s.status = 'running'
          )
        returning j.lease_expires_at`,
      [jobId, normalizedWorkerId, leaseSeconds],
    );

    if (result.rowCount === 0) {
      throw new HttpError(409, 'Worker lease could not be renewed.', 'JOB_LEASE_LOST');
    }

    return { leaseExpiresAt: result.rows[0].lease_expires_at };
  }

  async function completeJob({ jobId, workerId, assessment }) {
    const normalizedWorkerId = assertWorkerId(workerId);
    const normalized = normalizeAssessmentResult(assessment);
    const contentHash = hashEvidence(normalized.normalizedData);

    const client = await pool.connect();
    try {
      await client.query('begin');

      const locked = await client.query(
        `select j.id, j.organization_id, j.scan_id, j.job_type, j.status,
                j.worker_id, (j.lease_expires_at > now()) as lease_valid,
                s.status as scan_status, s.target_id,
                s.scoring_profile_id, s.scoring_profile_version,
                s.scoring_profile_definition_hash
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
      if (row.status === 'completed') {
        await client.query('commit');
        return { alreadyCompleted: true, jobId: row.id, scanId: row.scan_id };
      }

      assertActiveLease(row, normalizedWorkerId);

      const evidenceInsert = await client.query(
        `insert into public.evidence (
           organization_id, scan_id, detector_id, detector_version,
           type, source, normalized_data, content_hash
         ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
         on conflict (scan_id, detector_id, type, source, content_hash)
           where content_hash is not null
         do nothing
         returning id`,
        [
          row.organization_id,
          row.scan_id,
          normalized.detectorId,
          normalized.detectorVersion,
          normalized.evidenceType,
          normalized.source,
          JSON.stringify(normalized.normalizedData),
          contentHash,
        ],
      );

      let evidenceId = evidenceInsert.rows[0]?.id;
      if (!evidenceId) {
        const existingEvidence = await client.query(
          `select id from public.evidence
            where scan_id = $1
              and detector_id = $2
              and type = $3
              and source = $4
              and content_hash = $5
            limit 1`,
          [row.scan_id, normalized.detectorId, normalized.evidenceType, normalized.source, contentHash],
        );
        evidenceId = existingEvidence.rows[0]?.id;
      }

      if (!evidenceId) {
        throw new HttpError(500, 'Evidence persistence did not produce an identifier.', 'EVIDENCE_PERSISTENCE_FAILED');
      }

      for (const issue of normalized.issues) {
        if (issue.ruleId) {
          const ruleMatch = await client.query(
            `select 1
               from public.rule_versions
              where rule_id = $1
                and version = $2
                and definition_hash = $3
              limit 1`,
            [issue.ruleId, issue.ruleVersion, issue.ruleDefinitionHash],
          );
          if (ruleMatch.rowCount === 0) {
            throw new HttpError(
              500,
              'Worker Rule definition does not match the persisted Rule version.',
              'RULE_DEFINITION_HASH_MISMATCH',
              {
                ruleId: issue.ruleId,
                ruleVersion: issue.ruleVersion,
              },
            );
          }
        }

        const fingerprint = createFindingFingerprint({
          targetId: row.target_id,
          detectorId: normalized.detectorId,
          findingId: issue.id,
        });

        const findingResult = await client.query(
          `insert into public.findings (
             organization_id, target_id, rule_id, fingerprint,
             status, first_seen_at, last_seen_at
           ) values ($1, $2, $3, $4, 'open', now(), now())
           on conflict (organization_id, target_id, fingerprint)
           do update set last_seen_at = excluded.last_seen_at,
                         rule_id = coalesce(public.findings.rule_id, excluded.rule_id),
                         updated_at = now()
           where public.findings.rule_id is null
              or public.findings.rule_id is not distinct from excluded.rule_id
           returning id, rule_id`,
          [row.organization_id, row.target_id, issue.ruleId, fingerprint],
        );

        if (findingResult.rowCount === 0) {
          throw new HttpError(
            500,
            'Finding rule provenance conflicts with the persisted finding identity.',
            'FINDING_RULE_PROVENANCE_CONFLICT',
          );
        }

        await client.query(
          `insert into public.finding_instances (
             organization_id, finding_id, scan_id,
             rule_id, rule_version, rule_definition_hash,
             severity, confidence, evidence_ids, message, remediation
           ) values ($1, $2, $3, $4, $5, $6, $7, null, $8::uuid[], $9, $10)
           on conflict (finding_id, scan_id) do nothing`,
          [
            row.organization_id,
            findingResult.rows[0].id,
            row.scan_id,
            issue.ruleId,
            issue.ruleVersion,
            issue.ruleDefinitionHash,
            issue.severity,
            [evidenceId],
            `${issue.title}: ${issue.description}`,
            issue.remediation,
          ],
        );
      }

      const resultSummary = {
        state: normalized.state,
        score: normalized.score,
        detectorId: normalized.detectorId,
        detectorVersion: normalized.detectorVersion,
        evidenceId,
        findingCount: normalized.issues.length,
      };

      await client.query(
        `update public.scan_jobs
            set status = 'completed',
                result_summary = $2::jsonb,
                completed_at = now(),
                failed_at = null,
                error_code = null,
                error_message = null,
                leased_at = null,
                lease_expires_at = null,
                updated_at = now()
          where id = $1`,
        [row.id, JSON.stringify(resultSummary)],
      );

      const coverageEntry = {
        state: normalized.state,
        score: normalized.score,
        detectorId: normalized.detectorId,
        detectorVersion: normalized.detectorVersion,
        evidenceId,
      };

      await client.query(
        `update public.scans
            set coverage = jsonb_set(
                  coalesce(coverage, '{}'::jsonb),
                  array[$3]::text[],
                  $4::jsonb,
                  true
                ),
                notices = coalesce(notices, '[]'::jsonb) || $5::jsonb,
                updated_at = now()
          where id = $1 and organization_id = $2`,
        [
          row.scan_id,
          row.organization_id,
          row.job_type,
          JSON.stringify(coverageEntry),
          JSON.stringify(normalized.notices),
        ],
      );

      const aggregate = await client.query(
        `select job_type, status, result_summary
           from public.scan_jobs
          where scan_id = $1 and organization_id = $2
          order by job_type asc`,
        [row.scan_id, row.organization_id],
      );

      const allCompleted = aggregate.rowCount > 0 && aggregate.rows.every((job) => job.status === 'completed');
      if (allCompleted) {
        const scoringProfile = getScoringProfile(
          row.scoring_profile_id,
          row.scoring_profile_version,
          row.scoring_profile_definition_hash,
        );
        const moduleResults = Object.fromEntries(
          aggregate.rows.map((job) => [job.job_type, job.result_summary || {}]),
        );
        const scoringResult = computeWeightedScanScore(moduleResults, scoringProfile);

        await client.query(
          `update public.scans
              set status = 'completed',
                  overall_score = $3,
                  completed_at = now(),
                  failed_at = null,
                  error_code = null,
                  error_message = null,
                  updated_at = now()
            where id = $1
              and organization_id = $2
              and scoring_profile_definition_hash = $4
              and status = 'running'`,
          [row.scan_id, row.organization_id, scoringResult.score, scoringResult.profileDefinitionHash],
        );
      }

      await client.query('commit');
      return {
        alreadyCompleted: false,
        jobId: row.id,
        scanId: row.scan_id,
        evidenceId,
        findingCount: normalized.issues.length,
        scanCompleted: allCompleted,
      };
    } catch (error) {
      await rollbackQuietly(client, 'Job completion');
      throw error;
    } finally {
      client.release();
    }
  }

  async function failJob({ jobId, workerId, error }) {
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

      if (row.attempt_count < row.max_attempts) {
        const retryDelaySeconds = calculateRetryDelaySeconds(row.attempt_count);
        const retrySummary = {
          state: 'retrying',
          attemptCount: row.attempt_count,
          maxAttempts: row.max_attempts,
          errorCode: failure.code,
        };

        const retried = await client.query(
          `update public.scan_jobs
              set status = 'queued',
                  available_at = now() + ($2 * interval '1 second'),
                  leased_at = null,
                  lease_expires_at = null,
                  worker_id = null,
                  error_code = $3,
                  error_message = $4,
                  result_summary = $5::jsonb,
                  updated_at = now()
            where id = $1
            returning available_at`,
          [row.id, retryDelaySeconds, failure.code, failure.message, JSON.stringify(retrySummary)],
        );

        await client.query(
          `update public.scans
              set coverage = jsonb_set(
                    coalesce(coverage, '{}'::jsonb),
                    array[$3]::text[],
                    $4::jsonb,
                    true
                  ),
                  updated_at = now()
            where id = $1 and organization_id = $2`,
          [
            row.scan_id,
            row.organization_id,
            row.job_type,
            JSON.stringify({
              state: 'retrying',
              attemptCount: row.attempt_count,
              maxAttempts: row.max_attempts,
            }),
          ],
        );

        await client.query('commit');
        return {
          alreadyFinalized: false,
          retryScheduled: true,
          availableAt: retried.rows[0].available_at,
        };
      }

      const failedSummary = {
        state: 'error',
        attemptCount: row.attempt_count,
        maxAttempts: row.max_attempts,
        errorCode: failure.code,
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
                error_message = 'Cancelled because another requested scan module exhausted its retries.',
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
          JSON.stringify({ state: 'error', attemptCount: row.attempt_count, maxAttempts: row.max_attempts }),
        ],
      );

      await client.query('commit');
      return { alreadyFinalized: false, retryScheduled: false, scanFailed: true };
    } catch (caught) {
      await rollbackQuietly(client, 'Job failure');
      throw caught;
    } finally {
      client.release();
    }
  }

  return {
    claimNextJob,
    completeJob,
    failJob,
    getExecutionContext,
    renewLease,
  };
}

module.exports = {
  assertActiveLease,
  createJobRepository,
  normalizeWorkerJobTypes,
};
