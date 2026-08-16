const { normalizeAssessmentResult } = require('../domain/assessmentResult');
const { HttpError } = require('../lib/httpError');
const { createFindingFingerprint, hashEvidence } = require('../lib/evidenceIntegrity');
const { assertActiveLease } = require('../repositories/jobRepository');
const { assertWorkerId } = require('../domain/jobLifecycle');

async function rollbackQuietly(client) {
  try {
    await client.query('rollback');
  } catch (error) {
    console.error('[Database] Job completion rollback failed:', error);
  }
}

function createJobCompletionService({ pool }) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Job completion service requires a PostgreSQL pool.');
  }

  async function complete({ jobId, workerId, assessment }) {
    const normalizedWorkerId = assertWorkerId(workerId);
    const normalized = normalizeAssessmentResult(assessment);
    const contentHash = hashEvidence(normalized.normalizedData);
    const client = await pool.connect();

    try {
      await client.query('begin');

      const locked = await client.query(
        `select j.id, j.organization_id, j.scan_id, j.job_type, j.status,
                j.worker_id, (j.lease_expires_at > now()) as lease_valid,
                s.status as scan_status, s.target_id
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

      for (const issue of normalized.issues) {
        const registeredRule = await client.query(
          `select 1
             from public.rule_versions
            where rule_id = $1 and version = $2
            limit 1`,
          [issue.ruleId, issue.ruleVersion],
        );

        if (registeredRule.rowCount === 0) {
          throw new HttpError(
            500,
            'Worker referenced an unregistered rule version.',
            'RULE_VERSION_NOT_REGISTERED',
            { ruleId: issue.ruleId, ruleVersion: issue.ruleVersion },
          );
        }
      }

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
           do update set rule_id = excluded.rule_id,
                         last_seen_at = excluded.last_seen_at,
                         updated_at = now()
           returning id`,
          [row.organization_id, row.target_id, issue.ruleId, fingerprint],
        );

        await client.query(
          `insert into public.finding_instances (
             organization_id, finding_id, scan_id, rule_id, rule_version,
             severity, confidence, evidence_ids, message, remediation
           ) values ($1, $2, $3, $4, $5, $6, null, $7::uuid[], $8, $9)
           on conflict (finding_id, scan_id) do nothing`,
          [
            row.organization_id,
            findingResult.rows[0].id,
            row.scan_id,
            issue.ruleId,
            issue.ruleVersion,
            issue.severity,
            [evidenceId],
            `${issue.title}: ${issue.description}`,
            issue.remediation,
          ],
        );
      }

      const resultSummary = {
        state: 'assessed',
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
        state: 'assessed',
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
        `select
           count(*) filter (where status <> 'completed')::int as unfinished_jobs,
           round(avg((result_summary->>'score')::numeric)
             filter (where status = 'completed' and result_summary ? 'score'))::int as overall_score
         from public.scan_jobs
        where scan_id = $1 and organization_id = $2`,
        [row.scan_id, row.organization_id],
      );

      const allCompleted = aggregate.rows[0].unfinished_jobs === 0;
      if (allCompleted) {
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
              and status = 'running'`,
          [row.scan_id, row.organization_id, aggregate.rows[0].overall_score],
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
      await rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }
  }

  return { complete };
}

module.exports = { createJobCompletionService };
