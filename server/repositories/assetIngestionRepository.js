const { HttpError } = require('../lib/httpError');
const {
  assertLeaseSeconds,
  assertWorkerId,
  calculateRetryDelaySeconds,
  sanitizeJobError,
} = require('../domain/jobLifecycle');
const { mapAssetUploadRow, uploadColumns } = require('./assetUploadRepository');

function mapIngestionJobRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    uploadId: row.upload_id,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at,
    leasedAt: row.leased_at,
    leaseExpiresAt: row.lease_expires_at,
    workerId: row.worker_id,
    resultSummary: row.result_summary || {},
    errorCode: row.error_code,
    errorMessage: row.error_message,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function jobColumns() {
  return `id, organization_id, upload_id, status, attempt_count, max_attempts,
          available_at, leased_at, lease_expires_at, worker_id, result_summary,
          error_code, error_message, completed_at, failed_at, created_at, updated_at`;
}

function assertAssetLease(row, workerId) {
  if (
    row.status !== 'running' ||
    row.worker_id !== workerId ||
    row.lease_valid !== true ||
    row.upload_status !== 'processing'
  ) {
    throw new HttpError(409, 'Asset ingestion Worker no longer owns an active lease.', 'ASSET_INGESTION_LEASE_LOST');
  }
}

function createAssetIngestionRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Asset ingestion repository requires a PostgreSQL pool.');
  }

  async function claimNextJob({ workerId, leaseSeconds = 90 }) {
    const normalizedWorkerId = assertWorkerId(workerId);
    assertLeaseSeconds(leaseSeconds);
    const client = await pool.connect();
    try {
      await client.query('begin');
      const candidate = await client.query(
        `select j.id, j.organization_id, j.upload_id, j.status, j.attempt_count,
                j.max_attempts, j.available_at, j.lease_expires_at,
                u.status as upload_status
           from public.asset_ingestion_jobs j
           join public.asset_uploads u
             on u.id = j.upload_id and u.organization_id = j.organization_id
          where j.attempt_count < j.max_attempts
            and (
              (j.status = 'queued' and j.available_at <= now() and u.status = 'uploaded')
              or
              (j.status = 'running' and j.lease_expires_at <= now() and u.status = 'processing')
            )
          order by j.available_at asc, j.created_at asc
          for update of j, u skip locked
          limit 1`,
      );
      if (candidate.rowCount === 0) {
        await client.query('commit');
        return null;
      }

      const row = candidate.rows[0];
      const job = await client.query(
        `update public.asset_ingestion_jobs
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
          returning ${jobColumns()}`,
        [row.id, leaseSeconds, normalizedWorkerId],
      );
      await client.query(
        `update public.asset_uploads
            set status = 'processing',
                processing_started_at = coalesce(processing_started_at, now()),
                updated_at = now()
          where id = $1`,
        [row.upload_id],
      );
      await client.query('commit');
      return mapIngestionJobRow(job.rows[0]);
    } catch (error) {
      try { await client.query('rollback'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async function renewLease({ jobId, workerId, leaseSeconds = 90 }) {
    const normalizedWorkerId = assertWorkerId(workerId);
    assertLeaseSeconds(leaseSeconds);
    const result = await pool.query(
      `update public.asset_ingestion_jobs j
          set lease_expires_at = now() + ($3 * interval '1 second'),
              updated_at = now()
        where j.id = $1
          and j.worker_id = $2
          and j.status = 'running'
          and j.lease_expires_at > now()
          and exists (
            select 1 from public.asset_uploads u
             where u.id = j.upload_id
               and u.organization_id = j.organization_id
               and u.status = 'processing'
          )
        returning lease_expires_at`,
      [jobId, normalizedWorkerId, leaseSeconds],
    );
    if (result.rowCount === 0) {
      throw new HttpError(409, 'Asset ingestion lease could not be renewed.', 'ASSET_INGESTION_LEASE_LOST');
    }
    return { leaseExpiresAt: result.rows[0].lease_expires_at };
  }

  async function getExecutionContext({ jobId, workerId }) {
    const normalizedWorkerId = assertWorkerId(workerId);
    const result = await pool.query(
      `select j.id as job_id, j.organization_id, j.upload_id, j.status,
              j.worker_id, (j.lease_expires_at > now()) as lease_valid,
              u.status as upload_status, u.pipeline_version,
              u.quarantine_object_key, u.file_name,
              u.declared_media_type, u.declared_byte_length,
              u.upload_expires_at
         from public.asset_ingestion_jobs j
         join public.asset_uploads u
           on u.id = j.upload_id and u.organization_id = j.organization_id
        where j.id = $1
        limit 1`,
      [jobId],
    );
    if (result.rowCount === 0) {
      throw new HttpError(404, 'Asset ingestion Job was not found.', 'ASSET_INGESTION_JOB_NOT_FOUND');
    }
    const row = result.rows[0];
    assertAssetLease(row, normalizedWorkerId);
    return {
      jobId: row.job_id,
      organizationId: row.organization_id,
      uploadId: row.upload_id,
      pipelineVersion: row.pipeline_version,
      quarantineObjectKey: row.quarantine_object_key,
      fileName: row.file_name,
      declaredMediaType: row.declared_media_type,
      declaredByteLength: Number(row.declared_byte_length),
      uploadExpiresAt: row.upload_expires_at,
    };
  }

  async function completeInfected({ jobId, workerId, observed, malware }) {
    const normalizedWorkerId = assertWorkerId(workerId);
    const client = await pool.connect();
    try {
      await client.query('begin');
      const locked = await client.query(
        `select j.id, j.organization_id, j.upload_id, j.status, j.worker_id,
                (j.lease_expires_at > now()) as lease_valid,
                u.status as upload_status, u.created_by
           from public.asset_ingestion_jobs j
           join public.asset_uploads u
             on u.id = j.upload_id and u.organization_id = j.organization_id
          where j.id = $1
          for update of j, u`,
        [jobId],
      );
      if (locked.rowCount === 0) throw new HttpError(404, 'Asset ingestion Job was not found.', 'ASSET_INGESTION_JOB_NOT_FOUND');
      const row = locked.rows[0];
      if (row.status === 'completed') {
        await client.query('commit');
        return { alreadyCompleted: true, uploadId: row.upload_id };
      }
      assertAssetLease(row, normalizedWorkerId);

      await client.query(
        `update public.asset_uploads
            set status = 'infected',
                detected_media_type = $3,
                actual_byte_length = $4,
                content_sha256 = $5,
                malware_verdict = 'infected',
                malware_engine_id = $6,
                malware_engine_version = $7,
                malware_signature_version = $8,
                completed_at = now(),
                updated_at = now()
          where organization_id = $1 and id = $2`,
        [
          row.organization_id, row.upload_id, observed.detectedMediaType,
          observed.actualByteLength, observed.sha256, malware.engineId,
          malware.engineVersion, malware.signatureVersion,
        ],
      );
      await client.query(
        `update public.asset_ingestion_jobs
            set status = 'completed',
                result_summary = $2::jsonb,
                completed_at = now(),
                leased_at = null,
                lease_expires_at = null,
                worker_id = null,
                error_code = null,
                error_message = null,
                updated_at = now()
          where id = $1`,
        [jobId, JSON.stringify({ state: 'rejected', malwareVerdict: 'infected', sha256: observed.sha256 })],
      );
      await client.query(
        `insert into public.audit_events (
           organization_id, actor_id, action, target_type, target_id, metadata
         ) values ($1, $2, 'asset.malware_detected', 'asset_upload', $3, $4::jsonb)`,
        [row.organization_id, row.created_by, row.upload_id, JSON.stringify({ engineId: malware.engineId })],
      );
      await client.query('commit');
      return { alreadyCompleted: false, uploadId: row.upload_id, status: 'infected' };
    } catch (error) {
      try { await client.query('rollback'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async function completeClean({ jobId, workerId, observed, malware, parser, cleanObjectKey }) {
    const normalizedWorkerId = assertWorkerId(workerId);
    const client = await pool.connect();
    try {
      await client.query('begin');
      const locked = await client.query(
        `select j.id, j.organization_id, j.upload_id, j.status, j.worker_id,
                (j.lease_expires_at > now()) as lease_valid,
                u.status as upload_status, u.file_name, u.created_by, u.pipeline_version
           from public.asset_ingestion_jobs j
           join public.asset_uploads u
             on u.id = j.upload_id and u.organization_id = j.organization_id
          where j.id = $1
          for update of j, u`,
        [jobId],
      );
      if (locked.rowCount === 0) throw new HttpError(404, 'Asset ingestion Job was not found.', 'ASSET_INGESTION_JOB_NOT_FOUND');
      const row = locked.rows[0];
      if (row.status === 'completed') {
        const existing = await client.query(
          `select target_id from public.asset_uploads where id = $1 limit 1`,
          [row.upload_id],
        );
        await client.query('commit');
        return { alreadyCompleted: true, uploadId: row.upload_id, targetId: existing.rows[0]?.target_id || null };
      }
      assertAssetLease(row, normalizedWorkerId);

      await client.query(
        `update public.asset_uploads
            set status = 'clean',
                clean_object_key = $3,
                detected_media_type = $4,
                actual_byte_length = $5,
                content_sha256 = $6,
                malware_verdict = 'clean',
                malware_engine_id = $7,
                malware_engine_version = $8,
                malware_signature_version = $9,
                parser_id = $10,
                parser_version = $11,
                extracted_text_sha256 = $12,
                extracted_text_length = $13,
                page_count = $14,
                completed_at = now(),
                error_code = null,
                error_message = null,
                updated_at = now()
          where organization_id = $1 and id = $2`,
        [
          row.organization_id, row.upload_id, cleanObjectKey,
          observed.detectedMediaType, observed.actualByteLength, observed.sha256,
          malware.engineId, malware.engineVersion, malware.signatureVersion,
          parser.parserId, parser.parserVersion, parser.extractedTextSha256,
          parser.extractedTextLength, parser.pageCount,
        ],
      );

      const verificationMetadata = {
        assetUploadId: row.upload_id,
        sha256: observed.sha256,
        mediaType: observed.detectedMediaType,
        pipelineVersion: row.pipeline_version,
        parserId: parser.parserId,
        parserVersion: parser.parserVersion,
      };
      const target = await client.query(
        `insert into public.targets (
           organization_id, type, display_name, canonical_url, provider,
           verification_state, verification_metadata, created_by
         ) values ($1, 'asset', $2, null, 'guardai-upload', 'verified', $3::jsonb, $4)
         returning id`,
        [row.organization_id, row.file_name, JSON.stringify(verificationMetadata), row.created_by],
      );
      const targetId = target.rows[0].id;
      await client.query(
        `update public.asset_uploads set target_id = $2, updated_at = now() where id = $1`,
        [row.upload_id, targetId],
      );
      await client.query(
        `update public.asset_ingestion_jobs
            set status = 'completed',
                result_summary = $2::jsonb,
                completed_at = now(),
                leased_at = null,
                lease_expires_at = null,
                worker_id = null,
                error_code = null,
                error_message = null,
                updated_at = now()
          where id = $1`,
        [jobId, JSON.stringify({
          state: 'clean', targetId, sha256: observed.sha256,
          mediaType: observed.detectedMediaType,
          parserId: parser.parserId, parserVersion: parser.parserVersion,
        })],
      );
      await client.query(
        `insert into public.audit_events (
           organization_id, actor_id, action, target_type, target_id, metadata
         ) values
           ($1, $2, 'asset.ingestion_clean', 'asset_upload', $3, $4::jsonb),
           ($1, $2, 'target.created', 'target', $5, $6::jsonb)`,
        [
          row.organization_id, row.created_by, row.upload_id,
          JSON.stringify({ sha256: observed.sha256, mediaType: observed.detectedMediaType }),
          targetId,
          JSON.stringify({ type: 'asset', provider: 'guardai-upload', assetUploadId: row.upload_id }),
        ],
      );
      await client.query('commit');
      return { alreadyCompleted: false, uploadId: row.upload_id, targetId, status: 'clean' };
    } catch (error) {
      try { await client.query('rollback'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async function failJob({ jobId, workerId, error, retryable = true }) {
    const normalizedWorkerId = assertWorkerId(workerId);
    const failure = sanitizeJobError(error);
    const client = await pool.connect();
    try {
      await client.query('begin');
      const locked = await client.query(
        `select j.id, j.organization_id, j.upload_id, j.status, j.worker_id,
                j.attempt_count, j.max_attempts,
                (j.lease_expires_at > now()) as lease_valid,
                u.status as upload_status
           from public.asset_ingestion_jobs j
           join public.asset_uploads u
             on u.id = j.upload_id and u.organization_id = j.organization_id
          where j.id = $1
          for update of j, u`,
        [jobId],
      );
      if (locked.rowCount === 0) throw new HttpError(404, 'Asset ingestion Job was not found.', 'ASSET_INGESTION_JOB_NOT_FOUND');
      const row = locked.rows[0];
      if (['completed','failed','cancelled'].includes(row.status)) {
        await client.query('commit');
        return { alreadyFinalized: true, status: row.status };
      }
      assertAssetLease(row, normalizedWorkerId);

      if (retryable && row.attempt_count < row.max_attempts) {
        const retryDelaySeconds = calculateRetryDelaySeconds(row.attempt_count);
        await client.query(
          `update public.asset_ingestion_jobs
              set status = 'queued',
                  available_at = now() + ($2 * interval '1 second'),
                  leased_at = null, lease_expires_at = null, worker_id = null,
                  error_code = $3, error_message = $4,
                  result_summary = $5::jsonb, updated_at = now()
            where id = $1`,
          [jobId, retryDelaySeconds, failure.code, failure.message, JSON.stringify({ state: 'retrying', errorCode: failure.code })],
        );
        await client.query(
          `update public.asset_uploads
              set status = 'uploaded', error_code = $2, error_message = $3, updated_at = now()
            where id = $1`,
          [row.upload_id, failure.code, failure.message],
        );
        await client.query('commit');
        return { alreadyFinalized: false, retryScheduled: true };
      }

      await client.query(
        `update public.asset_ingestion_jobs
            set status = 'failed', failed_at = now(),
                leased_at = null, lease_expires_at = null, worker_id = null,
                error_code = $2, error_message = $3,
                result_summary = $4::jsonb, updated_at = now()
          where id = $1`,
        [jobId, failure.code, failure.message, JSON.stringify({ state: 'error', errorCode: failure.code })],
      );
      await client.query(
        `update public.asset_uploads
            set status = 'failed', completed_at = now(),
                error_code = $2, error_message = $3, updated_at = now()
          where id = $1`,
        [row.upload_id, failure.code, failure.message],
      );
      await client.query('commit');
      return { alreadyFinalized: false, retryScheduled: false };
    } catch (caught) {
      try { await client.query('rollback'); } catch {}
      throw caught;
    } finally {
      client.release();
    }
  }

  return {
    claimNextJob,
    completeClean,
    completeInfected,
    failJob,
    getExecutionContext,
    renewLease,
  };
}

module.exports = {
  assertAssetLease,
  createAssetIngestionRepository,
  jobColumns,
  mapIngestionJobRow,
};
