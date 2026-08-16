const { statusAfterRediscovery } = require('../domain/findingLifecycle');

async function writeStatusEvent(client, {
  organizationId,
  findingId,
  scanId = null,
  fromStatus = null,
  toStatus,
  reason = null,
  actorId = null,
}) {
  await client.query(
    `insert into public.finding_status_events (
       organization_id, finding_id, scan_id, from_status, to_status, reason, actor_id
     ) values ($1, $2, $3, $4, $5, $6, $7)`,
    [organizationId, findingId, scanId, fromStatus, toStatus, reason, actorId],
  );
}

async function observeFinding(client, {
  organizationId,
  targetId,
  scanId,
  ruleId,
  ruleVersion,
  fingerprint,
  severity,
  evidenceId,
  message,
  remediation,
}) {
  const existingResult = await client.query(
    `select id, status
       from public.findings
      where organization_id = $1
        and target_id = $2
        and fingerprint = $3
      limit 1
      for update`,
    [organizationId, targetId, fingerprint],
  );

  let findingId;
  let currentStatus;

  if (existingResult.rowCount === 0) {
    const inserted = await client.query(
      `insert into public.findings (
         organization_id, target_id, rule_id, fingerprint,
         status, first_seen_at, last_seen_at,
         status_reason, status_updated_at, status_updated_by
       ) values ($1, $2, $3, $4, 'open', now(), now(),
                 'First observed by scanner', now(), null)
       returning id, status`,
      [organizationId, targetId, ruleId, fingerprint],
    );
    findingId = inserted.rows[0].id;
    currentStatus = inserted.rows[0].status;
    await writeStatusEvent(client, {
      organizationId,
      findingId,
      scanId,
      fromStatus: null,
      toStatus: 'open',
      reason: 'First observed by scanner',
    });
  } else {
    findingId = existingResult.rows[0].id;
    currentStatus = existingResult.rows[0].status;
    const nextStatus = statusAfterRediscovery(currentStatus);
    const reopened = nextStatus !== currentStatus;

    await client.query(
      `update public.findings
          set rule_id = $4,
              status = $5,
              last_seen_at = now(),
              status_reason = case when $6 then 'Rediscovered by scanner' else status_reason end,
              status_updated_at = case when $6 then now() else status_updated_at end,
              status_updated_by = case when $6 then null else status_updated_by end,
              updated_at = now()
        where organization_id = $1 and target_id = $2 and id = $3`,
      [organizationId, targetId, findingId, ruleId, nextStatus, reopened],
    );

    if (reopened) {
      await writeStatusEvent(client, {
        organizationId,
        findingId,
        scanId,
        fromStatus: currentStatus,
        toStatus: nextStatus,
        reason: 'Rediscovered by scanner',
      });
      currentStatus = nextStatus;
    }
  }

  await client.query(
    `insert into public.finding_instances (
       organization_id, finding_id, scan_id, rule_id, rule_version,
       severity, confidence, evidence_ids, message, remediation
     ) values ($1, $2, $3, $4, $5, $6, null, $7::uuid[], $8, $9)
     on conflict (finding_id, scan_id) do nothing`,
    [
      organizationId,
      findingId,
      scanId,
      ruleId,
      ruleVersion,
      severity,
      [evidenceId],
      message,
      remediation,
    ],
  );

  return { findingId, status: currentStatus };
}

module.exports = {
  observeFinding,
  writeStatusEvent,
};