const { HttpError } = require('../lib/httpError');
const {
  decodeTimestampIdCursor,
  encodeTimestampIdCursor,
} = require('../lib/paginationCursor');

function mapPublicationRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    targetId: row.target_id,
    reportSnapshotId: row.report_snapshot_id,
    publicSlug: row.public_slug,
    organizationNameSnapshot: row.organization_name_snapshot,
    status: row.status,
    createdBy: row.created_by,
    publishedAt: row.published_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReportRow(row) {
  return {
    id: row.report_id,
    organizationId: row.organization_id,
    scanId: row.scan_id,
    schemaVersion: row.report_schema_version,
    reportType: row.report_type,
    snapshot: row.report_snapshot,
    snapshotHash: row.report_snapshot_hash,
    createdBy: row.report_created_by,
    createdAt: row.report_created_at,
  };
}

function normalizeTrustLimit(value) {
  if (value === undefined || value === null || value === '') return 25;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new HttpError(400, 'Trust publication limit must be between 1 and 100.', 'INVALID_TRUST_LIMIT');
  }
  return parsed;
}

function createTrustPublicationRepository(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('Trust publication repository requires a PostgreSQL pool.');
  }

  async function createPublication({
    organizationId,
    targetId,
    reportSnapshotId,
    publicSlug,
    createdBy,
  }) {
    const inserted = await pool.query(
      `insert into public.trust_publications (
         organization_id, target_id, report_snapshot_id, public_slug,
         organization_name_snapshot, status, created_by
       )
       select $1, $2, $3, $4, o.name, 'published', $5
         from public.organizations o
         join public.report_snapshots r
           on r.id = $3 and r.organization_id = $1
        where o.id = $1
          and r.report_type = 'technical-screening'
          and r.snapshot->'target'->>'id' = $2::text
       on conflict do nothing
       returning id, organization_id, target_id, report_snapshot_id, public_slug,
                 organization_name_snapshot, status, created_by,
                 published_at, revoked_at, created_at, updated_at`,
      [organizationId, targetId, reportSnapshotId, publicSlug, createdBy],
    );

    if (inserted.rowCount > 0) {
      return { created: true, publication: mapPublicationRow(inserted.rows[0]), slugCollision: false };
    }

    const existing = await pool.query(
      `select id, organization_id, target_id, report_snapshot_id, public_slug,
              organization_name_snapshot, status, created_by,
              published_at, revoked_at, created_at, updated_at
         from public.trust_publications
        where organization_id = $1
          and report_snapshot_id = $2
          and status = 'published'
        limit 1`,
      [organizationId, reportSnapshotId],
    );

    if (existing.rowCount > 0) {
      return { created: false, publication: mapPublicationRow(existing.rows[0]), slugCollision: false };
    }

    return { created: false, publication: null, slugCollision: true };
  }

  async function listPublications({ organizationId, limit, cursor }) {
    const pageSize = normalizeTrustLimit(limit);
    const decodedCursor = decodeTimestampIdCursor(cursor);
    const params = [organizationId];
    let cursorClause = '';
    if (decodedCursor) {
      params.push(decodedCursor.createdAt, decodedCursor.id);
      cursorClause = 'and (created_at, id) < ($2::timestamptz, $3::uuid)';
    }
    params.push(pageSize + 1);
    const limitIndex = params.length;

    const result = await pool.query(
      `select id, organization_id, target_id, report_snapshot_id, public_slug,
              organization_name_snapshot, status, created_by,
              published_at, revoked_at, created_at, updated_at
         from public.trust_publications
        where organization_id = $1
          ${cursorClause}
        order by created_at desc, id desc
        limit $${limitIndex}`,
      params,
    );

    const hasMore = result.rows.length > pageSize;
    const rows = hasMore ? result.rows.slice(0, pageSize) : result.rows;
    const last = rows.at(-1);
    return {
      publications: rows.map(mapPublicationRow),
      nextCursor: hasMore && last ? encodeTimestampIdCursor(last.created_at, last.id) : null,
    };
  }

  async function revokePublication(organizationId, publicationId) {
    const updated = await pool.query(
      `update public.trust_publications
          set status = 'revoked',
              revoked_at = now(),
              updated_at = now()
        where organization_id = $1
          and id = $2
          and status = 'published'
        returning id, organization_id, target_id, report_snapshot_id, public_slug,
                  organization_name_snapshot, status, created_by,
                  published_at, revoked_at, created_at, updated_at`,
      [organizationId, publicationId],
    );
    if (updated.rowCount > 0) return mapPublicationRow(updated.rows[0]);

    const existing = await pool.query(
      `select id, organization_id, target_id, report_snapshot_id, public_slug,
              organization_name_snapshot, status, created_by,
              published_at, revoked_at, created_at, updated_at
         from public.trust_publications
        where organization_id = $1 and id = $2
        limit 1`,
      [organizationId, publicationId],
    );
    return existing.rowCount > 0 ? mapPublicationRow(existing.rows[0]) : null;
  }

  async function getByPublicSlug(publicSlug) {
    const result = await pool.query(
      `select p.id, p.organization_id, p.target_id, p.report_snapshot_id,
              p.public_slug, p.organization_name_snapshot, p.status,
              p.created_by, p.published_at, p.revoked_at, p.created_at, p.updated_at,
              r.id as report_id, r.scan_id, r.schema_version as report_schema_version,
              r.report_type, r.snapshot as report_snapshot,
              r.snapshot_hash as report_snapshot_hash,
              r.created_by as report_created_by, r.created_at as report_created_at
         from public.trust_publications p
         join public.report_snapshots r
           on r.id = p.report_snapshot_id
          and r.organization_id = p.organization_id
        where p.public_slug = $1
        limit 1`,
      [publicSlug],
    );

    if (result.rowCount === 0) return null;
    return {
      publication: mapPublicationRow(result.rows[0]),
      report: mapReportRow(result.rows[0]),
    };
  }

  return {
    createPublication,
    getByPublicSlug,
    listPublications,
    revokePublication,
  };
}

module.exports = {
  createTrustPublicationRepository,
  mapPublicationRow,
  normalizeTrustLimit,
};
