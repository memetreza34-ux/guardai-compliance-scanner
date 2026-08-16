const { HttpError } = require('../lib/httpError');
const {
  decodeTimestampIdCursor,
  encodeTimestampIdCursor,
} = require('../lib/paginationCursor');

function normalizeEvidenceLimit(value) {
  if (value === undefined || value === null || value === '') return 50;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new HttpError(400, 'Evidence limit must be an integer between 1 and 100.', 'INVALID_EVIDENCE_LIMIT');
  }
  return parsed;
}

function normalizeEvidenceFilterText(value, field, maxLength) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} filter is invalid.`, 'INVALID_EVIDENCE_FILTER');
  }
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > maxLength) {
    throw new HttpError(400, `${field} filter is invalid.`, 'INVALID_EVIDENCE_FILTER');
  }
  return normalized;
}

function mapEvidenceExplorerRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    scanId: row.scan_id,
    targetId: row.target_id,
    targetDisplayName: row.target_display_name,
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

function createEvidenceRepository(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('Evidence repository requires a PostgreSQL pool.');
  }

  async function listEvidence({
    organizationId,
    targetId = null,
    scanId = null,
    detectorId = null,
    type = null,
    limit,
    cursor,
  }) {
    const pageSize = normalizeEvidenceLimit(limit);
    const decodedCursor = decodeTimestampIdCursor(cursor);
    const params = [organizationId];
    const where = ['e.organization_id = $1'];

    if (targetId) {
      params.push(targetId);
      where.push(`s.target_id = $${params.length}`);
    }
    if (scanId) {
      params.push(scanId);
      where.push(`e.scan_id = $${params.length}`);
    }

    const normalizedDetectorId = normalizeEvidenceFilterText(detectorId, 'detectorId', 120);
    if (normalizedDetectorId) {
      params.push(normalizedDetectorId);
      where.push(`e.detector_id = $${params.length}`);
    }

    const normalizedType = normalizeEvidenceFilterText(type, 'type', 120);
    if (normalizedType) {
      params.push(normalizedType);
      where.push(`e.type = $${params.length}`);
    }

    if (decodedCursor) {
      params.push(decodedCursor.createdAt, decodedCursor.id);
      const timestampIndex = params.length - 1;
      const idIndex = params.length;
      where.push(`(e.captured_at, e.id) < ($${timestampIndex}::timestamptz, $${idIndex}::uuid)`);
    }

    params.push(pageSize + 1);
    const limitIndex = params.length;
    const result = await pool.query(
      `select e.id, e.organization_id, e.scan_id,
              s.target_id, t.display_name as target_display_name,
              e.detector_id, e.detector_version, e.type, e.source,
              e.normalized_data, e.content_hash, e.captured_at, e.created_at
         from public.evidence e
         join public.scans s
           on s.id = e.scan_id and s.organization_id = e.organization_id
         join public.targets t
           on t.id = s.target_id and t.organization_id = s.organization_id
        where ${where.join(' and ')}
        order by e.captured_at desc, e.id desc
        limit $${limitIndex}`,
      params,
    );

    const hasMore = result.rows.length > pageSize;
    const rows = hasMore ? result.rows.slice(0, pageSize) : result.rows;
    const last = rows.at(-1);
    return {
      evidence: rows.map(mapEvidenceExplorerRow),
      nextCursor: hasMore && last
        ? encodeTimestampIdCursor(last.captured_at, last.id)
        : null,
    };
  }

  async function getEvidence(organizationId, evidenceId) {
    const result = await pool.query(
      `select e.id, e.organization_id, e.scan_id,
              s.target_id, t.display_name as target_display_name,
              e.detector_id, e.detector_version, e.type, e.source,
              e.normalized_data, e.content_hash, e.captured_at, e.created_at
         from public.evidence e
         join public.scans s
           on s.id = e.scan_id and s.organization_id = e.organization_id
         join public.targets t
           on t.id = s.target_id and t.organization_id = s.organization_id
        where e.organization_id = $1 and e.id = $2
        limit 1`,
      [organizationId, evidenceId],
    );

    return result.rowCount > 0 ? mapEvidenceExplorerRow(result.rows[0]) : null;
  }

  return {
    getEvidence,
    listEvidence,
  };
}

module.exports = {
  createEvidenceRepository,
  mapEvidenceExplorerRow,
  normalizeEvidenceFilterText,
  normalizeEvidenceLimit,
};