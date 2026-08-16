const { assertCapabilityEntitled } = require('../domain/entitlements');
const { HttpError } = require('../lib/httpError');

function normalizeUsageRequirements(requirements) {
  if (!requirements || typeof requirements !== 'object' || Array.isArray(requirements)) {
    throw new TypeError('Usage requirements must be an object.');
  }

  return Object.entries(requirements)
    .map(([capability, units]) => {
      if (!/^[a-z0-9][a-z0-9._-]{1,79}$/.test(capability)) {
        throw new TypeError('Usage capability is invalid.');
      }
      if (!Number.isInteger(units) || units < 1) {
        throw new TypeError('Usage units must be positive integers.');
      }
      return { capability, units };
    })
    .sort((left, right) => left.capability.localeCompare(right.capability));
}

async function rollbackQuietly(client, label) {
  try {
    await client.query('rollback');
  } catch (error) {
    console.error(`[Database] ${label} rollback failed:`, error);
  }
}

function createEntitlementRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Entitlement repository requires a PostgreSQL pool.');
  }

  async function reserveCapabilitiesForScan({ organizationId, scanId, requirements }) {
    const normalized = normalizeUsageRequirements(requirements);
    if (normalized.length === 0) return [];

    const client = await pool.connect();
    try {
      await client.query('begin');

      const subscriptionResult = await client.query(
        `select plan, status
           from public.subscriptions
          where organization_id = $1
            and status in ('active', 'trialing')
          limit 1
          for share`,
        [organizationId],
      );

      if (subscriptionResult.rowCount === 0) {
        throw new HttpError(
          403,
          'Organization does not have an active subscription state.',
          'SUBSCRIPTION_NOT_ACTIVE',
        );
      }

      const plan = subscriptionResult.rows[0].plan;
      const reservations = [];

      for (const requirement of normalized) {
        const entitlementResult = await client.query(
          `select capability, enabled, monthly_limit
             from public.plan_entitlements
            where plan = $1 and capability = $2
            limit 1
            for share`,
          [plan, requirement.capability],
        );

        const entitlementRow = entitlementResult.rows[0];
        const entitlement = entitlementRow
          ? {
              capability: entitlementRow.capability,
              enabled: entitlementRow.enabled,
              monthlyLimit: entitlementRow.monthly_limit === null
                ? null
                : Number(entitlementRow.monthly_limit),
            }
          : null;

        await client.query(
          `insert into public.organization_usage_monthly (
             organization_id, capability, period_start, used_units, reserved_units
           ) values ($1, $2, date_trunc('month', current_date)::date, 0, 0)
           on conflict (organization_id, capability, period_start) do nothing`,
          [organizationId, requirement.capability],
        );

        const usageResult = await client.query(
          `select used_units, reserved_units, period_start
             from public.organization_usage_monthly
            where organization_id = $1
              and capability = $2
              and period_start = date_trunc('month', current_date)::date
            for update`,
          [organizationId, requirement.capability],
        );

        const usage = {
          usedUnits: Number(usageResult.rows[0].used_units),
          reservedUnits: Number(usageResult.rows[0].reserved_units),
        };

        const existingReservation = await client.query(
          `select id, units, status, period_start
             from public.usage_reservations
            where scan_id = $1 and capability = $2
            limit 1
            for update`,
          [scanId, requirement.capability],
        );

        if (existingReservation.rowCount > 0) {
          const existing = existingReservation.rows[0];
          if (Number(existing.units) !== requirement.units) {
            throw new HttpError(
              409,
              'Existing usage reservation does not match this scan request.',
              'USAGE_RESERVATION_CONFLICT',
            );
          }
          reservations.push({
            id: existing.id,
            capability: requirement.capability,
            units: Number(existing.units),
            status: existing.status,
          });
          continue;
        }

        assertCapabilityEntitled(entitlement, requirement.capability, usage, requirement.units);

        const reservationResult = await client.query(
          `insert into public.usage_reservations (
             organization_id, scan_id, capability, units, period_start, status
           ) values (
             $1, $2, $3, $4, date_trunc('month', current_date)::date, 'reserved'
           )
           returning id, capability, units, status`,
          [organizationId, scanId, requirement.capability, requirement.units],
        );

        await client.query(
          `update public.organization_usage_monthly
              set reserved_units = reserved_units + $3,
                  updated_at = now()
            where organization_id = $1
              and capability = $2
              and period_start = date_trunc('month', current_date)::date`,
          [organizationId, requirement.capability, requirement.units],
        );

        reservations.push({
          id: reservationResult.rows[0].id,
          capability: reservationResult.rows[0].capability,
          units: Number(reservationResult.rows[0].units),
          status: reservationResult.rows[0].status,
        });
      }

      await client.query('commit');
      return reservations;
    } catch (error) {
      await rollbackQuietly(client, 'Usage reserve');
      throw error;
    } finally {
      client.release();
    }
  }

  async function finalizeReservationsForScan({ organizationId, scanId, outcome }) {
    if (!['consume', 'release'].includes(outcome)) {
      throw new TypeError('Usage reservation outcome must be consume or release.');
    }

    const client = await pool.connect();
    try {
      await client.query('begin');
      const reservationResult = await client.query(
        `select id, capability, units, period_start
           from public.usage_reservations
          where organization_id = $1
            and scan_id = $2
            and status = 'reserved'
          order by capability asc
          for update`,
        [organizationId, scanId],
      );

      for (const row of reservationResult.rows) {
        const units = Number(row.units);
        await client.query(
          `update public.organization_usage_monthly
              set reserved_units = greatest(0, reserved_units - $4),
                  used_units = used_units + case when $5 = 'consume' then $4 else 0 end,
                  updated_at = now()
            where organization_id = $1
              and capability = $2
              and period_start = $3`,
          [organizationId, row.capability, row.period_start, units, outcome],
        );
      }

      await client.query(
        `update public.usage_reservations
            set status = case when $3 = 'consume' then 'consumed' else 'released' end,
                updated_at = now()
          where organization_id = $1
            and scan_id = $2
            and status = 'reserved'`,
        [organizationId, scanId, outcome],
      );

      await client.query('commit');
      return { finalized: reservationResult.rowCount, outcome };
    } catch (error) {
      await rollbackQuietly(client, 'Usage finalize');
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    finalizeReservationsForScan,
    reserveCapabilitiesForScan,
  };
}

module.exports = {
  createEntitlementRepository,
  normalizeUsageRequirements,
};