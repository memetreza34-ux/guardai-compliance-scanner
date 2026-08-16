const { HttpError } = require('../lib/httpError');

function mapSubscriptionRow(row) {
  return {
    organizationId: row.organization_id,
    provider: row.provider,
    providerCustomerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
    providerPriceId: row.provider_price_id,
    plan: row.plan,
    status: row.status,
    cancelAtPeriodEnd: row.cancel_at_period_end === true,
    periodEnd: row.period_end,
    providerStateUpdatedAt: row.provider_state_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCheckoutRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    idempotencyKey: row.idempotency_key,
    plan: row.plan,
    status: row.status,
    providerSessionId: row.provider_session_id,
    expiresAt: row.expires_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeBillingError(error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_:-]{1,80}$/.test(error.code)
    ? error.code
    : 'BILLING_WEBHOOK_PROCESSING_FAILED';
  const message = String(error instanceof Error ? error.message : 'Billing webhook processing failed.')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 500) || 'Billing webhook processing failed.';
  return { code, message };
}

function createBillingRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Billing repository requires a PostgreSQL pool.');
  }

  async function getSubscriptionForOrganization(organizationId) {
    const result = await pool.query(
      `select organization_id, provider, provider_customer_id, provider_subscription_id,
              provider_price_id, plan, status, cancel_at_period_end, period_end,
              provider_state_updated_at, created_at, updated_at
         from public.subscriptions
        where organization_id = $1
        limit 1`,
      [organizationId],
    );
    return result.rowCount > 0 ? mapSubscriptionRow(result.rows[0]) : null;
  }

  async function attachStripeCustomer({ organizationId, customerId }) {
    const result = await pool.query(
      `update public.subscriptions
          set provider = 'stripe',
              provider_customer_id = coalesce(provider_customer_id, $2),
              updated_at = now()
        where organization_id = $1
          and (provider_customer_id is null or provider_customer_id = $2)
        returning organization_id, provider, provider_customer_id, provider_subscription_id,
                  provider_price_id, plan, status, cancel_at_period_end, period_end,
                  provider_state_updated_at, created_at, updated_at`,
      [organizationId, customerId],
    );
    if (result.rowCount === 0) {
      throw new HttpError(409, 'Organization is already linked to another billing customer.', 'BILLING_CUSTOMER_CONFLICT');
    }
    return mapSubscriptionRow(result.rows[0]);
  }

  async function claimCheckoutRequest({ organizationId, userId, idempotencyKey, plan }) {
    const client = await pool.connect();
    try {
      await client.query('begin');

      await client.query(
        `update public.billing_checkout_requests
            set status = 'expired', updated_at = now()
          where organization_id = $1
            and status = 'ready'
            and expires_at <= now()`,
        [organizationId],
      );

      const sameKey = await client.query(
        `select id, organization_id, idempotency_key, plan, status,
                provider_session_id, expires_at, created_by, created_at, updated_at
           from public.billing_checkout_requests
          where organization_id = $1 and idempotency_key = $2
          limit 1
          for update`,
        [organizationId, idempotencyKey],
      );

      if (sameKey.rowCount > 0) {
        const row = sameKey.rows[0];
        if (row.plan !== plan) {
          throw new HttpError(
            409,
            'Billing Idempotency-Key was already used for another plan.',
            'BILLING_IDEMPOTENCY_KEY_REUSED',
          );
        }
        if (row.status === 'ready' && row.expires_at > new Date()) {
          await client.query('commit');
          return { created: false, replay: true, resume: false, request: mapCheckoutRow(row) };
        }
        if (row.status === 'creating') {
          const age = Date.now() - new Date(row.updated_at).getTime();
          if (Number.isFinite(age) && age >= 60_000) {
            await client.query(
              `update public.billing_checkout_requests
                  set updated_at = now()
                where id = $1`,
              [row.id],
            );
            await client.query('commit');
            return { created: false, replay: false, resume: true, request: mapCheckoutRow(row) };
          }
          throw new HttpError(
            409,
            'Billing checkout request is already being created.',
            'BILLING_CHECKOUT_IN_PROGRESS',
          );
        }
        throw new HttpError(
          409,
          'Billing Idempotency-Key cannot be reused after this checkout state.',
          'BILLING_IDEMPOTENCY_KEY_REUSED',
        );
      }

      const inserted = await client.query(
        `insert into public.billing_checkout_requests (
           organization_id, idempotency_key, plan, status, created_by
         ) values ($1, $2, $3, 'creating', $4)
         on conflict do nothing
         returning id, organization_id, idempotency_key, plan, status,
                   provider_session_id, expires_at, created_by, created_at, updated_at`,
        [organizationId, idempotencyKey, plan, userId],
      );

      if (inserted.rowCount === 0) {
        const active = await client.query(
          `select id from public.billing_checkout_requests
            where organization_id = $1 and status in ('creating','ready')
            limit 1`,
          [organizationId],
        );
        throw new HttpError(
          409,
          active.rowCount > 0
            ? 'Organization already has an active billing checkout.'
            : 'Billing checkout request conflicted with another request.',
          active.rowCount > 0 ? 'BILLING_CHECKOUT_ALREADY_ACTIVE' : 'BILLING_CHECKOUT_CONFLICT',
        );
      }

      await client.query('commit');
      return { created: true, replay: false, resume: false, request: mapCheckoutRow(inserted.rows[0]) };
    } catch (error) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] Billing checkout claim rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function completeCheckoutRequest({ organizationId, idempotencyKey, sessionId, expiresAt }) {
    const result = await pool.query(
      `update public.billing_checkout_requests
          set status = 'ready',
              provider_session_id = $3,
              expires_at = $4,
              updated_at = now()
        where organization_id = $1
          and idempotency_key = $2
          and status = 'creating'
        returning id, organization_id, idempotency_key, plan, status,
                  provider_session_id, expires_at, created_by, created_at, updated_at`,
      [organizationId, idempotencyKey, sessionId, expiresAt],
    );
    if (result.rowCount === 0) {
      throw new HttpError(409, 'Billing checkout request could not be finalized.', 'BILLING_CHECKOUT_STATE_CONFLICT');
    }
    return mapCheckoutRow(result.rows[0]);
  }

  async function failCheckoutRequest({ organizationId, idempotencyKey }) {
    await pool.query(
      `update public.billing_checkout_requests
          set status = 'failed', updated_at = now()
        where organization_id = $1
          and idempotency_key = $2
          and status = 'creating'`,
      [organizationId, idempotencyKey],
    );
  }

  async function markCheckoutCompleted(sessionId) {
    if (!sessionId) return;
    await pool.query(
      `update public.billing_checkout_requests
          set status = 'completed', updated_at = now()
        where provider_session_id = $1
          and status in ('ready','expired')`,
      [sessionId],
    );
  }

  async function findOrganizationByStripeCustomer(customerId) {
    const result = await pool.query(
      `select organization_id
         from public.subscriptions
        where provider = 'stripe'
          and provider_customer_id = $1
        limit 1`,
      [customerId],
    );
    return result.rows[0]?.organization_id || null;
  }

  async function reconcileStripeSubscription({ organizationId, normalizedSubscription }) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const current = await client.query(
        `select organization_id, provider_customer_id
           from public.subscriptions
          where organization_id = $1
          for update`,
        [organizationId],
      );
      if (current.rowCount === 0) {
        throw new HttpError(404, 'Organization subscription record was not found.', 'SUBSCRIPTION_NOT_FOUND');
      }
      const existingCustomer = current.rows[0].provider_customer_id;
      if (existingCustomer && existingCustomer !== normalizedSubscription.providerCustomerId) {
        throw new HttpError(409, 'Stripe Customer does not match GuardAI Organization.', 'BILLING_CUSTOMER_CONFLICT');
      }

      const result = await client.query(
        `update public.subscriptions
            set provider = 'stripe',
                provider_customer_id = $2,
                provider_subscription_id = $3,
                provider_price_id = $4,
                plan = $5,
                status = $6,
                cancel_at_period_end = $7,
                period_end = $8,
                provider_state_updated_at = now(),
                updated_at = now()
          where organization_id = $1
          returning organization_id, provider, provider_customer_id, provider_subscription_id,
                    provider_price_id, plan, status, cancel_at_period_end, period_end,
                    provider_state_updated_at, created_at, updated_at`,
        [
          organizationId,
          normalizedSubscription.providerCustomerId,
          normalizedSubscription.providerSubscriptionId,
          normalizedSubscription.providerPriceId,
          normalizedSubscription.plan,
          normalizedSubscription.status,
          normalizedSubscription.cancelAtPeriodEnd,
          normalizedSubscription.periodEnd,
        ],
      );

      await client.query('commit');
      return mapSubscriptionRow(result.rows[0]);
    } catch (error) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] Billing reconciliation rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function claimWebhookEvent({
    eventId,
    eventType,
    providerCreatedAt,
    livemode,
    payloadHash,
  }) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(
        `insert into public.billing_webhook_events (
           provider, provider_event_id, event_type, provider_created_at,
           livemode, payload_hash, status
         ) values ('stripe', $1, $2, $3, $4, $5, 'received')
         on conflict (provider, provider_event_id) do nothing`,
        [eventId, eventType, providerCreatedAt, livemode, payloadHash],
      );

      const claimed = await client.query(
        `update public.billing_webhook_events
            set status = 'processing',
                error_code = null,
                error_message = null,
                updated_at = now()
          where provider = 'stripe'
            and provider_event_id = $1
            and (
              status in ('received', 'failed')
              or (status = 'processing' and updated_at < now() - interval '5 minutes')
            )
          returning id, status`,
        [eventId],
      );

      if (claimed.rowCount > 0) {
        await client.query('commit');
        return { claimed: true, final: false, status: 'processing' };
      }

      const existing = await client.query(
        `select status
           from public.billing_webhook_events
          where provider = 'stripe' and provider_event_id = $1
          limit 1`,
        [eventId],
      );
      await client.query('commit');
      const status = existing.rows[0]?.status || 'unknown';
      return {
        claimed: false,
        final: ['processed', 'ignored'].includes(status),
        status,
      };
    } catch (error) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] Billing webhook claim rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function finalizeWebhookEvent({ eventId, status, organizationId = null, error = null }) {
    if (!['processed', 'ignored', 'failed'].includes(status)) {
      throw new TypeError('Webhook final status is invalid.');
    }
    const failure = error ? sanitizeBillingError(error) : null;
    await pool.query(
      `update public.billing_webhook_events
          set status = $2,
              organization_id = coalesce($3, organization_id),
              error_code = $4,
              error_message = $5,
              processed_at = case when $2 in ('processed','ignored') then now() else processed_at end,
              updated_at = now()
        where provider = 'stripe' and provider_event_id = $1`,
      [
        eventId,
        status,
        organizationId,
        failure?.code || null,
        failure?.message || null,
      ],
    );
  }

  return {
    attachStripeCustomer,
    claimCheckoutRequest,
    claimWebhookEvent,
    completeCheckoutRequest,
    failCheckoutRequest,
    finalizeWebhookEvent,
    findOrganizationByStripeCustomer,
    getSubscriptionForOrganization,
    markCheckoutCompleted,
    reconcileStripeSubscription,
  };
}

module.exports = {
  createBillingRepository,
  mapCheckoutRow,
  mapSubscriptionRow,
  sanitizeBillingError,
};
