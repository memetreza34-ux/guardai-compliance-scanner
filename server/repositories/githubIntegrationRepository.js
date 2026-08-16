const { HttpError } = require('../lib/httpError');

function mapInstallationRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    installationId: Number(row.installation_id),
    accountId: Number(row.account_id),
    accountLogin: row.account_login,
    accountType: row.account_type,
    repositorySelection: row.repository_selection,
    status: row.status,
    installedBy: row.installed_by,
    installedAt: row.installed_at,
    suspendedAt: row.suspended_at,
    deletedAt: row.deleted_at,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeIntegrationError(error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_:-]{1,80}$/.test(error.code)
    ? error.code
    : 'GITHUB_WEBHOOK_PROCESSING_FAILED';
  const message = String(error instanceof Error ? error.message : 'GitHub webhook processing failed.')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 500) || 'GitHub webhook processing failed.';
  return { code, message };
}

function createGitHubIntegrationRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('GitHub integration repository requires PostgreSQL pool.');
  }

  async function createInstallationState({ organizationId, userId, tokenHash, expiresAt }) {
    const result = await pool.query(
      `insert into public.github_installation_states (
         organization_id, token_hash, created_by, expires_at
       ) values ($1, $2, $3, $4)
       returning id, organization_id, created_by, expires_at`,
      [organizationId, tokenHash, userId, expiresAt],
    );
    return {
      id: result.rows[0].id,
      organizationId: result.rows[0].organization_id,
      createdBy: result.rows[0].created_by,
      expiresAt: result.rows[0].expires_at,
    };
  }

  async function getValidInstallationState(tokenHash) {
    const result = await pool.query(
      `select id, organization_id, created_by, expires_at
         from public.github_installation_states
        where token_hash = $1
          and used_at is null
          and expires_at > now()
        limit 1`,
      [tokenHash],
    );
    if (result.rowCount === 0) return null;
    return {
      id: result.rows[0].id,
      organizationId: result.rows[0].organization_id,
      createdBy: result.rows[0].created_by,
      expiresAt: result.rows[0].expires_at,
    };
  }

  async function consumeStateAndLinkInstallation({ stateId, installation }) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const state = await client.query(
        `select id, organization_id, created_by, expires_at, used_at
           from public.github_installation_states
          where id = $1
          for update`,
        [stateId],
      );
      if (
        state.rowCount === 0 ||
        state.rows[0].used_at ||
        new Date(state.rows[0].expires_at).getTime() <= Date.now()
      ) {
        throw new HttpError(409, 'GitHub installation state is no longer valid.', 'GITHUB_INSTALLATION_STATE_INVALID');
      }
      const stateRow = state.rows[0];

      const conflict = await client.query(
        `select organization_id
           from public.github_installations
          where installation_id = $1
            and status <> 'deleted'
          limit 1`,
        [installation.installationId],
      );
      if (conflict.rowCount > 0 && conflict.rows[0].organization_id !== stateRow.organization_id) {
        throw new HttpError(
          409,
          'GitHub installation is already linked to another GuardAI Organization.',
          'GITHUB_INSTALLATION_TENANT_CONFLICT',
        );
      }

      await client.query(
        `update public.github_installations
            set status = 'deleted',
                deleted_at = coalesce(deleted_at, now()),
                updated_at = now()
          where organization_id = $1
            and status <> 'deleted'
            and installation_id <> $2`,
        [stateRow.organization_id, installation.installationId],
      );

      const linked = await client.query(
        `insert into public.github_installations (
           organization_id, installation_id, account_id, account_login,
           account_type, repository_selection, status, installed_by,
           suspended_at, deleted_at, last_synced_at
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, null, now())
         on conflict (installation_id) do update
           set account_id = excluded.account_id,
               account_login = excluded.account_login,
               account_type = excluded.account_type,
               repository_selection = excluded.repository_selection,
               status = excluded.status,
               installed_by = excluded.installed_by,
               suspended_at = excluded.suspended_at,
               deleted_at = null,
               last_synced_at = now(),
               updated_at = now()
         where public.github_installations.organization_id = excluded.organization_id
         returning id, organization_id, installation_id, account_id, account_login,
                   account_type, repository_selection, status, installed_by,
                   installed_at, suspended_at, deleted_at, last_synced_at,
                   created_at, updated_at`,
        [
          stateRow.organization_id,
          installation.installationId,
          installation.accountId,
          installation.accountLogin,
          installation.accountType,
          installation.repositorySelection,
          installation.suspendedAt ? 'suspended' : 'active',
          stateRow.created_by,
          installation.suspendedAt,
        ],
      );
      if (linked.rowCount === 0) {
        throw new HttpError(409, 'GitHub installation could not be linked.', 'GITHUB_INSTALLATION_TENANT_CONFLICT');
      }

      await client.query(
        `update public.github_installation_states
            set used_at = now()
          where id = $1`,
        [stateId],
      );
      await client.query('commit');
      return mapInstallationRow(linked.rows[0]);
    } catch (error) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] GitHub installation link rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function getActiveInstallation(organizationId) {
    const result = await pool.query(
      `select id, organization_id, installation_id, account_id, account_login,
              account_type, repository_selection, status, installed_by,
              installed_at, suspended_at, deleted_at, last_synced_at,
              created_at, updated_at
         from public.github_installations
        where organization_id = $1
          and status <> 'deleted'
        order by created_at desc
        limit 1`,
      [organizationId],
    );
    return result.rowCount > 0 ? mapInstallationRow(result.rows[0]) : null;
  }

  async function findByProviderInstallationId(installationId) {
    const result = await pool.query(
      `select id, organization_id, installation_id, account_id, account_login,
              account_type, repository_selection, status, installed_by,
              installed_at, suspended_at, deleted_at, last_synced_at,
              created_at, updated_at
         from public.github_installations
        where installation_id = $1
        limit 1`,
      [installationId],
    );
    return result.rowCount > 0 ? mapInstallationRow(result.rows[0]) : null;
  }

  async function updateInstallationLifecycle({
    installationId,
    status,
    account,
    repositorySelection,
  }) {
    const result = await pool.query(
      `update public.github_installations
          set account_id = coalesce($3, account_id),
              account_login = coalesce($4, account_login),
              account_type = coalesce($5, account_type),
              repository_selection = coalesce($6, repository_selection),
              status = $2,
              suspended_at = case
                when $2 = 'suspended' then coalesce(suspended_at, now())
                when $2 = 'active' then null
                else suspended_at
              end,
              deleted_at = case when $2 = 'deleted' then coalesce(deleted_at, now()) else null end,
              last_synced_at = now(),
              updated_at = now()
        where installation_id = $1
        returning id, organization_id, installation_id, account_id, account_login,
                  account_type, repository_selection, status, installed_by,
                  installed_at, suspended_at, deleted_at, last_synced_at,
                  created_at, updated_at`,
      [
        installationId,
        status,
        account?.id || null,
        account?.login || null,
        account?.type || null,
        repositorySelection || null,
      ],
    );
    return result.rowCount > 0 ? mapInstallationRow(result.rows[0]) : null;
  }

  async function touchInstallation(installationId, repositorySelection = null) {
    await pool.query(
      `update public.github_installations
          set repository_selection = coalesce($2, repository_selection),
              last_synced_at = now(),
              updated_at = now()
        where installation_id = $1
          and status <> 'deleted'`,
      [installationId, repositorySelection],
    );
  }

  async function claimWebhookEvent({ deliveryId, eventType, payloadHash }) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(
        `insert into public.integration_webhook_events (
           provider, delivery_id, event_type, payload_hash, status
         ) values ('github', $1, $2, $3, 'received')
         on conflict (provider, delivery_id) do nothing`,
        [deliveryId, eventType, payloadHash],
      );
      const claimed = await client.query(
        `update public.integration_webhook_events
            set status = 'processing',
                error_code = null,
                error_message = null,
                updated_at = now()
          where provider = 'github'
            and delivery_id = $1
            and (
              status in ('received','failed')
              or (status = 'processing' and updated_at < now() - interval '5 minutes')
            )
          returning status`,
        [deliveryId],
      );
      if (claimed.rowCount > 0) {
        await client.query('commit');
        return { claimed: true, status: 'processing' };
      }
      const existing = await client.query(
        `select status from public.integration_webhook_events
          where provider = 'github' and delivery_id = $1 limit 1`,
        [deliveryId],
      );
      await client.query('commit');
      return { claimed: false, status: existing.rows[0]?.status || 'unknown' };
    } catch (error) {
      try { await client.query('rollback'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async function finalizeWebhookEvent({ deliveryId, status, organizationId = null, error = null }) {
    if (!['processed', 'ignored', 'failed'].includes(status)) {
      throw new TypeError('GitHub webhook final status is invalid.');
    }
    const failure = error ? sanitizeIntegrationError(error) : null;
    await pool.query(
      `update public.integration_webhook_events
          set status = $2,
              organization_id = coalesce($3, organization_id),
              error_code = $4,
              error_message = $5,
              processed_at = case when $2 in ('processed','ignored') then now() else processed_at end,
              updated_at = now()
        where provider = 'github' and delivery_id = $1`,
      [deliveryId, status, organizationId, failure?.code || null, failure?.message || null],
    );
  }

  return {
    claimWebhookEvent,
    consumeStateAndLinkInstallation,
    createInstallationState,
    finalizeWebhookEvent,
    findByProviderInstallationId,
    getActiveInstallation,
    getValidInstallationState,
    touchInstallation,
    updateInstallationLifecycle,
  };
}

module.exports = {
  createGitHubIntegrationRepository,
  mapInstallationRow,
  sanitizeIntegrationError,
};
