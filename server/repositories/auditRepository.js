const { HttpError } = require('../lib/httpError');
const {
  decodeTimestampIdCursor,
  encodeTimestampIdCursor,
} = require('../lib/paginationCursor');

function normalizeAuditLimit(value) {
  if (value === undefined || value === null || value === '') return 50;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new HttpError(
      400,
      'Audit limit must be an integer between 1 and 100.',
      'INVALID_AUDIT_LIMIT',
    );
  }
  return parsed;
}

function mapAuditEvent(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    actorId: row.actor_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

function createAuditRepository(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('Audit repository requires a PostgreSQL pool.');
  }

  async function listAuditEvents({ organizationId, limit, cursor }) {
    const pageSize = normalizeAuditLimit(limit);
    const decodedCursor = decodeTimestampIdCursor(cursor);
    const params = [organizationId, pageSize + 1];
    let cursorClause = '';

    if (decodedCursor) {
      params.push(decodedCursor.createdAt, decodedCursor.id);
      cursorClause = 'and (created_at, id) < ($3::timestamptz, $4::uuid)';
    }

    const result = await pool.query(
      `select id, organization_id, actor_id, action, target_type, target_id,
              metadata, created_at
         from public.audit_events
        where organization_id = $1
          ${cursorClause}
        order by created_at desc, id desc
        limit $2`,
      params,
    );

    const hasMore = result.rows.length > pageSize;
    const visibleRows = hasMore ? result.rows.slice(0, pageSize) : result.rows;
    const last = visibleRows.at(-1);

    return {
      events: visibleRows.map(mapAuditEvent),
      nextCursor: hasMore && last
        ? encodeTimestampIdCursor(last.created_at, last.id)
        : null,
    };
  }

  return { listAuditEvents };
}

module.exports = {
  createAuditRepository,
  mapAuditEvent,
  normalizeAuditLimit,
};