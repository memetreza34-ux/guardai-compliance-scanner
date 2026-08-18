const test = require('node:test');
const assert = require('node:assert/strict');
const {
  finalizeReservationsForScanWithClient,
  normalizeUsageRequirements,
  reserveCapabilitiesForScanWithClient,
} = require('../repositories/entitlementRepository');


test('usage requirements are normalized in deterministic capability order', () => {
  assert.deepEqual(
    normalizeUsageRequirements({ repository_scan: 1, ai_screening: 2 }),
    [
      { capability: 'ai_screening', units: 2 },
      { capability: 'repository_scan', units: 1 },
    ],
  );
});

test('usage requirements reject malformed capabilities and units', () => {
  assert.throws(() => normalizeUsageRequirements({ 'bad capability': 1 }), /capability/i);
  assert.throws(() => normalizeUsageRequirements({ ai_screening: 0 }), /positive integers/i);
});

test('shared-client reservation checks subscription, entitlement and usage without opening its own transaction', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push([sql, params]);
      if (sql.includes('from public.subscriptions')) {
        return { rowCount: 1, rows: [{ plan: 'pro', status: 'active' }] };
      }
      if (sql.includes('from public.plan_entitlements')) {
        return { rowCount: 1, rows: [{ capability: 'repository_scan', enabled: true, monthly_limit: 10 }] };
      }
      if (sql.includes('insert into public.organization_usage_monthly')) {
        return { rowCount: 1, rows: [] };
      }
      if (sql.includes('select used_units, reserved_units, period_start')) {
        return { rowCount: 1, rows: [{ used_units: 2, reserved_units: 1, period_start: '2026-08-01' }] };
      }
      if (sql.includes('from public.usage_reservations') && sql.includes('limit 1')) {
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes('insert into public.usage_reservations')) {
        return {
          rowCount: 1,
          rows: [{ id: 'reservation-a', capability: 'repository_scan', units: 1, status: 'reserved' }],
        };
      }
      if (sql.includes('update public.organization_usage_monthly')) {
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };

  const result = await reserveCapabilitiesForScanWithClient(client, {
    organizationId: 'org-a',
    scanId: 'scan-a',
    requirements: { repository_scan: 1 },
  });

  assert.deepEqual(result, [{
    id: 'reservation-a',
    capability: 'repository_scan',
    units: 1,
    status: 'reserved',
  }]);
  assert.equal(queries.some(([sql]) => /^\s*(begin|commit|rollback)\b/i.test(sql)), false);
});

test('shared-client finalization consumes reserved units without opening its own transaction', async () => {
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push([sql, params]);
      if (sql.includes('from public.usage_reservations') && sql.includes("status = 'reserved'")) {
        return {
          rowCount: 1,
          rows: [{
            id: 'reservation-a',
            capability: 'repository_scan',
            units: 1,
            period_start: '2026-08-01',
          }],
        };
      }
      if (sql.includes('update public.organization_usage_monthly')) {
        return { rowCount: 1, rows: [] };
      }
      if (sql.includes('update public.usage_reservations')) {
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };

  const result = await finalizeReservationsForScanWithClient(client, {
    organizationId: 'org-a',
    scanId: 'scan-a',
    outcome: 'consume',
  });

  assert.deepEqual(result, { finalized: 1, outcome: 'consume' });
  assert.equal(queries.some(([sql]) => /^\s*(begin|commit|rollback)\b/i.test(sql)), false);
  const usageUpdate = queries.find(([sql]) => sql.includes('update public.organization_usage_monthly'));
  assert.equal(usageUpdate[1][4], 'consume');
});
