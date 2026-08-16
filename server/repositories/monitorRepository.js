const { HttpError } = require('../lib/httpError');
const {
  calculateNextMonitorRun,
  normalizeMonitorInterval,
  normalizeMonitorModule,
} = require('../domain/monitoring');
const { assertWorkerId, assertLeaseSeconds } = require('../domain/jobLifecycle');

function mapMonitorRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    targetId: row.target_id,
    moduleId: row.module_id,
    status: row.status,
    scheduleMinutes: row.schedule_minutes,
    nextRunAt: row.next_run_at,
    leasedAt: row.leased_at,
    leaseExpiresAt: row.lease_expires_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMonitorRunRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    monitorId: row.monitor_id,
    scheduledFor: row.scheduled_for,
    scanId: row.scan_id,
    createdAt: row.created_at,
  };
}

function createMonitorRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Monitor repository requires a PostgreSQL pool.');
  }

  async function createMonitor({ organizationId, targetId, moduleId, scheduleMinutes, createdBy }) {
    const normalizedModule = normalizeMonitorModule(moduleId);
    const normalizedInterval = normalizeMonitorInterval(scheduleMinutes);
    const result = await pool.query(
      `insert into public.monitors (
         organization_id, target_id, module_id, status,
         schedule_minutes, next_run_at, created_by
       )
       select $1, t.id, $3, 'active', $4, now(), $5
         from public.targets t
        where t.organization_id = $1
          and t.id = $2
          and t.type = 'website'
          and t.verification_state = 'verified'
       on conflict do nothing
       returning id, organization_id, target_id, module_id, status,
                 schedule_minutes, next_run_at, leased_at, lease_expires_at,
                 created_by, created_at, updated_at`,
      [organizationId, targetId, normalizedModule, normalizedInterval, createdBy],
    );
    if (result.rowCount > 0) return mapMonitorRow(result.rows[0]);

    const target = await pool.query(
      `select type, verification_state
         from public.targets
        where organization_id = $1 and id = $2
        limit 1`,
      [organizationId, targetId],
    );
    if (target.rowCount === 0) {
      throw new HttpError(404, 'Target was not found in this organization.', 'TARGET_NOT_FOUND');
    }
    if (target.rows[0].type !== 'website' || target.rows[0].verification_state !== 'verified') {
      throw new HttpError(
        409,
        'Monitoring requires a verified Website Target.',
        'MONITOR_TARGET_NOT_ELIGIBLE',
      );
    }
    throw new HttpError(
      409,
      'An active Security monitor already exists for this Target.',
      'MONITOR_ALREADY_EXISTS',
    );
  }

  async function listMonitors(organizationId) {
    const result = await pool.query(
      `select id, organization_id, target_id, module_id, status,
              schedule_minutes, next_run_at, leased_at, lease_expires_at,
              created_by, created_at, updated_at
         from public.monitors
        where organization_id = $1
          and status <> 'disabled'
        order by created_at desc`,
      [organizationId],
    );
    return result.rows.map(mapMonitorRow);
  }

  async function setStatus({ organizationId, monitorId, status }) {
    if (!['active', 'paused', 'disabled'].includes(status)) {
      throw new HttpError(400, 'Monitor status is invalid.', 'INVALID_MONITOR_STATUS');
    }
    const result = await pool.query(
      `update public.monitors
          set status = $3,
              leased_at = null,
              lease_expires_at = null,
              worker_id = null,
              next_run_at = case
                when $3 = 'active' then greatest(next_run_at, now())
                else next_run_at
              end,
              updated_at = now()
        where organization_id = $1 and id = $2
        returning id, organization_id, target_id, module_id, status,
                  schedule_minutes, next_run_at, leased_at, lease_expires_at,
                  created_by, created_at, updated_at`,
      [organizationId, monitorId, status],
    );
    return result.rowCount > 0 ? mapMonitorRow(result.rows[0]) : null;
  }

  async function claimDueMonitor({ workerId, leaseSeconds = 60 }) {
    const normalizedWorker = assertWorkerId(workerId);
    assertLeaseSeconds(leaseSeconds);
    const client = await pool.connect();
    try {
      await client.query('begin');
      const candidate = await client.query(
        `select m.id, m.organization_id, m.target_id, m.module_id, m.status,
                m.schedule_minutes, m.next_run_at, m.leased_at, m.lease_expires_at,
                m.created_by, m.created_at, m.updated_at,
                t.verification_state, t.type
           from public.monitors m
           join public.targets t
             on t.id = m.target_id and t.organization_id = m.organization_id
          where m.status = 'active'
            and m.next_run_at <= now()
            and (m.lease_expires_at is null or m.lease_expires_at <= now())
          order by m.next_run_at asc, m.created_at asc
          for update of m skip locked
          limit 1`,
      );
      if (candidate.rowCount === 0) {
        await client.query('commit');
        return null;
      }

      const row = candidate.rows[0];
      if (row.type !== 'website' || row.verification_state !== 'verified') {
        await client.query(
          `update public.monitors
              set status = 'paused',
                  leased_at = null,
                  lease_expires_at = null,
                  worker_id = null,
                  updated_at = now()
            where id = $1`,
          [row.id],
        );
        await client.query('commit');
        return {
          paused: true,
          reason: 'target_not_verified',
          monitor: mapMonitorRow(row),
        };
      }

      const leased = await client.query(
        `update public.monitors
            set leased_at = now(),
                lease_expires_at = now() + ($2 * interval '1 second'),
                worker_id = $3,
                updated_at = now()
          where id = $1
          returning id, organization_id, target_id, module_id, status,
                    schedule_minutes, next_run_at, leased_at, lease_expires_at,
                    created_by, created_at, updated_at`,
        [row.id, leaseSeconds, normalizedWorker],
      );
      await client.query('commit');
      return {
        paused: false,
        scheduledFor: row.next_run_at,
        monitor: mapMonitorRow(leased.rows[0]),
      };
    } catch (error) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] Monitor claim rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function completeScheduledRun({ monitorId, workerId, scheduledFor, scanId }) {
    const normalizedWorker = assertWorkerId(workerId);
    const client = await pool.connect();
    try {
      await client.query('begin');
      const locked = await client.query(
        `select id, organization_id, schedule_minutes, status, worker_id,
                (lease_expires_at > now()) as lease_valid
           from public.monitors
          where id = $1
          for update`,
        [monitorId],
      );
      if (locked.rowCount === 0) {
        throw new HttpError(404, 'Monitor was not found.', 'MONITOR_NOT_FOUND');
      }
      const monitor = locked.rows[0];
      if (
        monitor.status !== 'active' ||
        monitor.worker_id !== normalizedWorker ||
        monitor.lease_valid !== true
      ) {
        throw new HttpError(409, 'Monitor scheduler lease was lost.', 'MONITOR_LEASE_LOST');
      }

      const run = await client.query(
        `insert into public.monitor_runs (
           organization_id, monitor_id, scheduled_for, scan_id
         ) values ($1, $2, $3, $4)
         on conflict (monitor_id, scheduled_for) do update
           set scan_id = excluded.scan_id
         returning id, organization_id, monitor_id, scheduled_for, scan_id, created_at`,
        [monitor.organization_id, monitorId, scheduledFor, scanId],
      );

      const nextRunAt = calculateNextMonitorRun(
        scheduledFor,
        monitor.schedule_minutes,
      );
      await client.query(
        `update public.monitors
            set next_run_at = $2,
                leased_at = null,
                lease_expires_at = null,
                worker_id = null,
                updated_at = now()
          where id = $1`,
        [monitorId, nextRunAt],
      );
      await client.query('commit');
      return {
        run: mapMonitorRunRow(run.rows[0]),
        nextRunAt,
      };
    } catch (error) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] Monitor completion rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function releaseLease({ monitorId, workerId }) {
    const normalizedWorker = assertWorkerId(workerId);
    await pool.query(
      `update public.monitors
          set leased_at = null,
              lease_expires_at = null,
              worker_id = null,
              updated_at = now()
        where id = $1
          and worker_id = $2`,
      [monitorId, normalizedWorker],
    );
  }

  return {
    claimDueMonitor,
    completeScheduledRun,
    createMonitor,
    listMonitors,
    releaseLease,
    setStatus,
  };
}

module.exports = {
  createMonitorRepository,
  mapMonitorRow,
  mapMonitorRunRow,
};
