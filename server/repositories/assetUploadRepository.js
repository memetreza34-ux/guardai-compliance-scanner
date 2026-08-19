const { HttpError } = require('../lib/httpError');

function mapAssetUploadRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    targetId: row.target_id,
    status: row.status,
    pipelineVersion: row.pipeline_version,
    quarantineObjectKey: row.quarantine_object_key,
    cleanObjectKey: row.clean_object_key,
    fileName: row.file_name,
    declaredMediaType: row.declared_media_type,
    declaredByteLength: Number(row.declared_byte_length),
    detectedMediaType: row.detected_media_type,
    actualByteLength: row.actual_byte_length === null ? null : Number(row.actual_byte_length),
    contentSha256: row.content_sha256,
    malwareVerdict: row.malware_verdict,
    malwareEngineId: row.malware_engine_id,
    malwareEngineVersion: row.malware_engine_version,
    malwareSignatureVersion: row.malware_signature_version,
    parserId: row.parser_id,
    parserVersion: row.parser_version,
    extractedTextSha256: row.extracted_text_sha256,
    extractedTextLength: row.extracted_text_length,
    pageCount: row.page_count,
    createdBy: row.created_by,
    uploadExpiresAt: row.upload_expires_at,
    uploadedAt: row.uploaded_at,
    processingStartedAt: row.processing_started_at,
    completedAt: row.completed_at,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function uploadColumns() {
  return `id, organization_id, target_id, status, pipeline_version,
          quarantine_object_key, clean_object_key, file_name,
          declared_media_type, declared_byte_length, detected_media_type,
          actual_byte_length, content_sha256, malware_verdict,
          malware_engine_id, malware_engine_version, malware_signature_version,
          parser_id, parser_version, extracted_text_sha256,
          extracted_text_length, page_count, created_by, upload_expires_at,
          uploaded_at, processing_started_at, completed_at,
          error_code, error_message, created_at, updated_at`;
}

function createAssetUploadRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Asset upload repository requires a PostgreSQL pool.');
  }

  async function createPendingUpload({
    id,
    organizationId,
    createdBy,
    pipelineVersion,
    quarantineObjectKey,
    fileName,
    mediaType,
    byteLength,
    uploadExpiresAt,
  }) {
    const result = await pool.query(
      `insert into public.asset_uploads (
         id, organization_id, status, pipeline_version, quarantine_object_key,
         file_name, declared_media_type, declared_byte_length,
         created_by, upload_expires_at
       ) values ($1, $2, 'awaiting_upload', $3, $4, $5, $6, $7, $8, $9)
       returning ${uploadColumns()}`,
      [
        id,
        organizationId,
        pipelineVersion,
        quarantineObjectKey,
        fileName,
        mediaType,
        byteLength,
        createdBy,
        uploadExpiresAt,
      ],
    );
    return mapAssetUploadRow(result.rows[0]);
  }

  async function listUploads(organizationId, { limit = 50 } = {}) {
    const boundedLimit = Number.isInteger(limit) ? Math.min(100, Math.max(1, limit)) : 50;
    const result = await pool.query(
      `select ${uploadColumns()}
         from public.asset_uploads
        where organization_id = $1
        order by created_at desc, id desc
        limit $2`,
      [organizationId, boundedLimit],
    );
    return result.rows.map(mapAssetUploadRow);
  }

  async function getUpload(organizationId, uploadId) {
    const result = await pool.query(
      `select ${uploadColumns()}
         from public.asset_uploads
        where organization_id = $1 and id = $2
        limit 1`,
      [organizationId, uploadId],
    );

    return result.rowCount > 0 ? mapAssetUploadRow(result.rows[0]) : null;
  }

  async function markUploadSessionFailed({ organizationId, uploadId, errorCode, errorMessage }) {
    const result = await pool.query(
      `update public.asset_uploads
          set status = 'failed',
              error_code = $3,
              error_message = $4,
              completed_at = now(),
              updated_at = now()
        where organization_id = $1
          and id = $2
          and status = 'awaiting_upload'
        returning ${uploadColumns()}`,
      [organizationId, uploadId, errorCode, errorMessage],
    );
    return result.rowCount > 0 ? mapAssetUploadRow(result.rows[0]) : null;
  }

  async function finalizeUploadAndQueue({ organizationId, uploadId }) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const current = await client.query(
        `select ${uploadColumns()}
           from public.asset_uploads
          where organization_id = $1 and id = $2
          for update`,
        [organizationId, uploadId],
      );
      if (current.rowCount === 0) {
        throw new HttpError(404, 'Asset upload was not found.', 'ASSET_UPLOAD_NOT_FOUND');
      }
      const row = current.rows[0];
      if (['uploaded','processing','clean','infected','rejected'].includes(row.status)) {
        const existingJob = await client.query(
          `select id, status from public.asset_ingestion_jobs where upload_id = $1 limit 1`,
          [uploadId],
        );
        await client.query('commit');
        return {
          upload: mapAssetUploadRow(row),
          job: existingJob.rows[0] || null,
          idempotentReplay: true,
          expired: false,
        };
      }
      if (row.status !== 'awaiting_upload') {
        throw new HttpError(409, 'Asset upload is not finalizable in its current state.', 'ASSET_UPLOAD_STATE_INVALID');
      }
      if (new Date(row.upload_expires_at).getTime() <= Date.now()) {
        const expired = await client.query(
          `update public.asset_uploads
              set status = 'expired',
                  completed_at = now(),
                  error_code = 'ASSET_UPLOAD_EXPIRED',
                  error_message = 'Asset upload session expired before finalization.',
                  updated_at = now()
            where id = $1
            returning ${uploadColumns()}`,
          [uploadId],
        );
        await client.query('commit');
        return {
          upload: mapAssetUploadRow(expired.rows[0]),
          job: null,
          idempotentReplay: false,
          expired: true,
        };
      }

      const updated = await client.query(
        `update public.asset_uploads
            set status = 'uploaded',
                uploaded_at = now(),
                error_code = null,
                error_message = null,
                updated_at = now()
          where id = $1
          returning ${uploadColumns()}`,
        [uploadId],
      );
      const job = await client.query(
        `insert into public.asset_ingestion_jobs (
           organization_id, upload_id, status, available_at
         ) values ($1, $2, 'queued', now())
         on conflict (upload_id) do update set updated_at = now()
         returning id, organization_id, upload_id, status, attempt_count,
                   max_attempts, available_at, leased_at, lease_expires_at,
                   worker_id, result_summary, error_code, error_message,
                   completed_at, failed_at, created_at, updated_at`,
        [organizationId, uploadId],
      );

      await client.query(
        `insert into public.audit_events (
           organization_id, actor_id, action, target_type, target_id, metadata
         )
         select organization_id, created_by, 'asset.upload_finalized', 'asset_upload', id::text,
                jsonb_build_object('mediaType', declared_media_type, 'byteLength', declared_byte_length)
           from public.asset_uploads where id = $1`,
        [uploadId],
      );

      await client.query('commit');
      return {
        upload: mapAssetUploadRow(updated.rows[0]),
        job: job.rows[0],
        idempotentReplay: false,
        expired: false,
      };
    } catch (error) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] Asset finalize rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    createPendingUpload,
    finalizeUploadAndQueue,
    getUpload,
    listUploads,
    markUploadSessionFailed,
  };
}

module.exports = {
  createAssetUploadRepository,
  mapAssetUploadRow,
  uploadColumns,
};
