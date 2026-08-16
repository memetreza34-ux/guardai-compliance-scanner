const { HttpError } = require('../lib/httpError');
const {
  decodeTimestampIdCursor,
  encodeTimestampIdCursor,
} = require('../lib/paginationCursor');

function normalizeNotificationLimit(value) {
  if (value === undefined || value === null || value === '') return 30;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new HttpError(400, 'Notification limit must be between 1 and 100.', 'INVALID_NOTIFICATION_LIMIT');
  }
  return parsed;
}

function mapNotificationRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    type: row.type,
    scanId: row.scan_id,
    findingId: row.finding_id,
    severity: row.severity,
    title: row.title,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function createNotificationRepository(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('Notification repository requires a PostgreSQL pool.');
  }

  async function list({ organizationId, unreadOnly = false, limit, cursor }) {
    const pageSize = normalizeNotificationLimit(limit);
    const decodedCursor = decodeTimestampIdCursor(cursor);
    const params = [organizationId, unreadOnly];
    let cursorClause = '';
    if (decodedCursor) {
      params.push(decodedCursor.createdAt, decodedCursor.id);
      cursorClause = 'and (created_at, id) < ($3::timestamptz, $4::uuid)';
    }
    params.push(pageSize + 1);
    const limitIndex = params.length;

    const result = await pool.query(
      `select id, organization_id, type, scan_id, finding_id, severity,
              title, message, read_at, created_at
         from public.notifications
        where organization_id = $1
          and ($2::boolean = false or read_at is null)
          ${cursorClause}
        order by created_at desc, id desc
        limit $${limitIndex}`,
      params,
    );

    const hasMore = result.rows.length > pageSize;
    const rows = hasMore ? result.rows.slice(0, pageSize) : result.rows;
    const last = rows.at(-1);
    return {
      notifications: rows.map(mapNotificationRow),
      nextCursor: hasMore && last ? encodeTimestampIdCursor(last.created_at, last.id) : null,
    };
  }

  async function markRead({ organizationId, notificationId }) {
    const result = await pool.query(
      `update public.notifications
          set read_at = coalesce(read_at, now())
        where organization_id = $1 and id = $2
        returning id, organization_id, type, scan_id, finding_id, severity,
                  title, message, read_at, created_at`,
      [organizationId, notificationId],
    );
    return result.rowCount > 0 ? mapNotificationRow(result.rows[0]) : null;
  }

  async function markAllRead(organizationId) {
    const result = await pool.query(
      `update public.notifications
          set read_at = now()
        where organization_id = $1 and read_at is null`,
      [organizationId],
    );
    return { updated: result.rowCount };
  }

  return { list, markAllRead, markRead };
}

module.exports = {
  createNotificationRepository,
  mapNotificationRow,
  normalizeNotificationLimit,
};
