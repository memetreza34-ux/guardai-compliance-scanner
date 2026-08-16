const { HttpError } = require('../lib/httpError');
const {
  decodeTimestampIdCursor,
  encodeTimestampIdCursor,
} = require('../lib/paginationCursor');
const { writeAuditEvent } = require('./auditWriter');
const { writeStatusEvent } = require('./findingObservationWriter');

function normalizeFindingLimit(value) {
  if (value === undefined || value === null || value === '') return 50;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new HttpError(400, 'Finding limit must be an integer between 1 and 100.', 'INVALID_FINDING_LIMIT');
  }
  return parsed;
}

function mapFinding(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    targetId: row.target_id,
    ruleId: row.rule_id,
    ruleTitle: row.rule_title || null,
    fingerprint: row.fingerprint,
    status: row.status,
    statusReason: row.status_reason,
    statusUpdatedAt: row.status_updated_at,
    statusUpdatedBy: row.status_updated_by,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStatusEvent(row) {
  return {
    id: row.id,
    findingId: row.finding_id,
    scanId: row.scan_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    reason: row.reason,
    actorId: row.actor_id,
    createdAt: row.created_at,
  };
}

function createFindingRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Finding repository requires a PostgreSQL pool.');
  }

  async function getFinding(organizationId, findingId) {
    const result = await pool.query(
      `select f.id, f.organization_id, f.target_id, f.rule_id, r.title as rule_title,
              f.fingerprint, f.status, f.status_reason, f.status_updated_at,
              f.status_updated_by, f.first_seen_at, f.last_seen_at,
              f.created_at, f.updated_at
         from public.findings f
         left join public.rules r on r.id = f.rule_id
        where f.organization_id = $1 and f.id = $2
        limit 1`,
      [organizationId, findingId],
    );
    return result.rowCount > 0 ? mapFinding(result.rows[0]) : null;
  }

  async function listFindings({ organizationId, status = null, targetId = null, limit, cursor }) {
    const pageSize = normalizeFindingLimit(limit);
    const decodedCursor = decodeTimestampIdCursor(cursor);
    const params = [organizationId];
    const where = ['f.organization_id = $1'];

    if (status) {
      params.push(status);
      where.push(`f.status = $${params.length}`);
    }
    if (targetId) {
      params.push(targetId);
      where.push(`f.target_id = $${params.length}`);
    }
    if (decodedCursor) {
      params.push(decodedCursor.createdAt, decodedCursor.id);
      const timestampIndex = params.length - 1;
      const idIndex = params.length;
      where.push(`(f.status_updated_at, f.id) < ($${timestampIndex}::timestamptz, $${idIndex}::uuid)`);
    }

    params.push(pageSize + 1);
    const limitIndex = params.length;
    const result = await pool.query(
      `select f.id, f.organization_id, f.target_id, f.rule_id, r.title as rule_title,
              f.fingerprint, f.status, f.status_reason, f.status_updated_at,
              f.status_updated_by, f.first_seen_at, f.last_seen_at,
              f.created_at, f.updated_at
         from public.findings f
         left join public.rules r on r.id = f.rule_id
        where ${where.join(' and ')}
        order by f.status_updated_at desc, f.id desc
        limit $${limitIndex}`,
      params,
    );

    const hasMore = result.rows.length > pageSize;
    const rows = hasMore ? result.rows.slice(0, pageSize) : result.rows;
    const last = rows.at(-1);
    return {
      findings: rows.map(mapFinding),
      nextCursor: hasMore && last
        ? encodeTimestampIdCursor(last.status_updated_at, last.id)
        : null,
    };
  }

  async function transitionStatus({
    organizationId,
    findingId,
    expectedCurrentStatus,
    nextStatus,
    reason,
    actorId,
  }) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const locked = await client.query(
        `select id, organization_id, target_id, rule_id, fingerprint, status,
                status_reason, status_updated_at, status_updated_by,
                first_seen_at, last_seen_at, created_at, updated_at
           from public.findings
          where organization_id = $1 and id = $2
          for update`,
        [organizationId, findingId],
      );

      if (locked.rowCount === 0) {
        throw new HttpError(404, 'Finding was not found in this organization.', 'FINDING_NOT_FOUND');
      }

      const current = locked.rows[0];
      if (current.status !== expectedCurrentStatus) {
        throw new HttpError(
          409,
          'Finding status changed while the request was being processed.',
          'FINDING_STATUS_CHANGED',
          { currentStatus: current.status },
        );
      }

      if (current.status === nextStatus) {
        await client.query('commit');
        return mapFinding(current);
      }

      const updated = await client.query(
        `update public.findings
            set status = $3,
                status_reason = $4,
                status_updated_at = now(),
                status_updated_by = $5,
                updated_at = now()
          where organization_id = $1 and id = $2
          returning id, organization_id, target_id, rule_id, fingerprint, status,
                    status_reason, status_updated_at, status_updated_by,
                    first_seen_at, last_seen_at, created_at, updated_at`,
        [organizationId, findingId, nextStatus, reason, actorId],
      );

      await writeStatusEvent(client, {
        organizationId,
        findingId,
        fromStatus: current.status,
        toStatus: nextStatus,
        reason,
        actorId,
      });
      await writeAuditEvent(client, {
        organizationId,
        actorId,
        action: 'finding.status_changed',
        targetType: 'finding',
        targetId: findingId,
        metadata: { from: current.status, to: nextStatus },
      });

      await client.query('commit');
      return mapFinding(updated.rows[0]);
    } catch (error) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] Finding status rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function listStatusHistory({ organizationId, findingId, limit, cursor }) {
    const pageSize = normalizeFindingLimit(limit);
    const decodedCursor = decodeTimestampIdCursor(cursor);
    const params = [organizationId, findingId];
    let cursorClause = '';

    if (decodedCursor) {
      params.push(decodedCursor.createdAt, decodedCursor.id);
      cursorClause = `and (created_at, id) < ($3::timestamptz, $4::uuid)`;
    }
    params.push(pageSize + 1);
    const limitIndex = params.length;

    const result = await pool.query(
      `select id, finding_id, scan_id, from_status, to_status, reason, actor_id, created_at
         from public.finding_status_events
        where organization_id = $1 and finding_id = $2
          ${cursorClause}
        order by created_at desc, id desc
        limit $${limitIndex}`,
      params,
    );

    const hasMore = result.rows.length > pageSize;
    const rows = hasMore ? result.rows.slice(0, pageSize) : result.rows;
    const last = rows.at(-1);
    return {
      events: rows.map(mapStatusEvent),
      nextCursor: hasMore && last
        ? encodeTimestampIdCursor(last.created_at, last.id)
        : null,
    };
  }

  return {
    getFinding,
    listFindings,
    listStatusHistory,
    transitionStatus,
  };
}

module.exports = {
  createFindingRepository,
  mapFinding,
  mapStatusEvent,
  normalizeFindingLimit,
};