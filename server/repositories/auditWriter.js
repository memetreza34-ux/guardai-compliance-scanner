function assertAuditClient(client) {
  if (!client || typeof client.query !== 'function') {
    throw new TypeError('Audit writer requires a PostgreSQL client.');
  }
}

async function writeAuditEvent(client, {
  organizationId,
  actorId = null,
  action,
  targetType = null,
  targetId = null,
  metadata = {},
}) {
  assertAuditClient(client);
  if (!organizationId || typeof action !== 'string' || action.length < 1 || action.length > 160) {
    throw new TypeError('Audit event organization/action is invalid.');
  }

  await client.query(
    `insert into public.audit_events (
       organization_id, actor_id, action, target_type, target_id, metadata
     ) values ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      organizationId,
      actorId,
      action,
      targetType,
      targetId,
      JSON.stringify(metadata),
    ],
  );
}

module.exports = {
  writeAuditEvent,
};