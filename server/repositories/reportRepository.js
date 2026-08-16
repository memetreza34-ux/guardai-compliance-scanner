const { HttpError } = require('../lib/httpError');
const {
  decodeTimestampIdCursor,
  encodeTimestampIdCursor,
} = require('../lib/paginationCursor');

function normalizeReportLimit(value) {
  if (value === undefined || value === null || value === '') return 25;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new HttpError(400, 'Report limit must be an integer between 1 and 100.', 'INVALID_REPORT_LIMIT');
  }
  return parsed;
}

function mapReportRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    scanId: row.scan_id,
    schemaVersion: row.schema_version,
    reportType: row.report_type,
    snapshot: row.snapshot,
    snapshotHash: row.snapshot_hash,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function createReportRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Report repository requires a PostgreSQL pool.');
  }

  async function createSnapshot({
    organizationId,
    scanId,
    schemaVersion,
    reportType,
    snapshot,
    snapshotHash,
    createdBy,
  }) {
    const result = await pool.query(
      `insert into public.report_snapshots (
         organization_id, scan_id, schema_version, report_type,
         snapshot, snapshot_hash, created_by
       ) values ($1, $2, $3, $4, $5::jsonb, $6, $7)
       on conflict (organization_id, scan_id, report_type, snapshot_hash)
       do nothing
       returning id, organization_id, scan_id, schema_version, report_type,
                 snapshot, snapshot_hash, created_by, created_at`,
      [
        organizationId,
        scanId,
        schemaVersion,
        reportType,
        JSON.stringify(snapshot),
        snapshotHash,
        createdBy,
      ],
    );

    if (result.rowCount > 0) return { created: true, report: mapReportRow(result.rows[0]) };

    const existing = await pool.query(
      `select id, organization_id, scan_id, schema_version, report_type,
              snapshot, snapshot_hash, created_by, created_at
         from public.report_snapshots
        where organization_id = $1
          and scan_id = $2
          and report_type = $3
          and snapshot_hash = $4
        limit 1`,
      [organizationId, scanId, reportType, snapshotHash],
    );

    if (existing.rowCount === 0) {
      throw new HttpError(409, 'Report snapshot conflicted with another request.', 'REPORT_CREATE_CONFLICT');
    }
    return { created: false, report: mapReportRow(existing.rows[0]) };
  }

  async function getSnapshot(organizationId, reportId) {
    const result = await pool.query(
      `select id, organization_id, scan_id, schema_version, report_type,
              snapshot, snapshot_hash, created_by, created_at
         from public.report_snapshots
        where organization_id = $1 and id = $2
        limit 1`,
      [organizationId, reportId],
    );
    return result.rowCount > 0 ? mapReportRow(result.rows[0]) : null;
  }

  async function listSnapshots({ organizationId, scanId = null, limit, cursor }) {
    const pageSize = normalizeReportLimit(limit);
    const decodedCursor = decodeTimestampIdCursor(cursor);
    const params = [organizationId];
    const where = ['organization_id = $1'];

    if (scanId) {
      params.push(scanId);
      where.push(`scan_id = $${params.length}`);
    }
    if (decodedCursor) {
      params.push(decodedCursor.createdAt, decodedCursor.id);
      const timestampIndex = params.length - 1;
      const idIndex = params.length;
      where.push(`(created_at, id) < ($${timestampIndex}::timestamptz, $${idIndex}::uuid)`);
    }

    params.push(pageSize + 1);
    const limitIndex = params.length;
    const result = await pool.query(
      `select id, organization_id, scan_id, schema_version, report_type,
              snapshot, snapshot_hash, created_by, created_at
         from public.report_snapshots
        where ${where.join(' and ')}
        order by created_at desc, id desc
        limit $${limitIndex}`,
      params,
    );

    const hasMore = result.rows.length > pageSize;
    const rows = hasMore ? result.rows.slice(0, pageSize) : result.rows;
    const last = rows.at(-1);
    return {
      reports: rows.map(mapReportRow),
      nextCursor: hasMore && last ? encodeTimestampIdCursor(last.created_at, last.id) : null,
    };
  }

  return {
    createSnapshot,
    getSnapshot,
    listSnapshots,
  };
}

module.exports = {
  createReportRepository,
  mapReportRow,
  normalizeReportLimit,
};