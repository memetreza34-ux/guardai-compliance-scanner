const { HttpError } = require('../lib/httpError');
const { MAX_VERIFICATION_ATTEMPTS } = require('../domain/targetVerification');

function mapChallenge(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    targetId: row.target_id,
    method: row.method,
    status: row.status,
    tokenHash: row.token_hash,
    dnsRecordName: row.dns_record_name,
    attemptCount: row.attempt_count,
    expiresAt: row.expires_at,
    lastCheckedAt: row.last_checked_at,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
  };
}

function createTargetVerificationRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Target verification repository requires a PostgreSQL pool.');
  }

  async function getTarget(organizationId, targetId) {
    const result = await pool.query(
      `select id, organization_id, type, canonical_url, display_name, verification_state
         from public.targets
        where organization_id = $1 and id = $2
        limit 1`,
      [organizationId, targetId],
    );
    return result.rows[0] || null;
  }

  async function createDnsChallenge({
    organizationId,
    targetId,
    createdBy,
    tokenHash,
    dnsRecordName,
    ttlMinutes,
  }) {
    const client = await pool.connect();
    try {
      await client.query('begin');

      const targetResult = await client.query(
        `select id, organization_id, type, canonical_url, verification_state
           from public.targets
          where organization_id = $1 and id = $2
          for update`,
        [organizationId, targetId],
      );

      if (targetResult.rowCount === 0) {
        throw new HttpError(404, 'Target was not found in this organization.', 'TARGET_NOT_FOUND');
      }
      if (targetResult.rows[0].verification_state === 'verified') {
        throw new HttpError(409, 'Target is already verified.', 'TARGET_ALREADY_VERIFIED');
      }

      await client.query(
        `update public.target_verification_challenges
            set status = 'expired', updated_at = now()
          where organization_id = $1
            and target_id = $2
            and status = 'pending'`,
        [organizationId, targetId],
      );

      const inserted = await client.query(
        `insert into public.target_verification_challenges (
           organization_id, target_id, method, status, token_hash,
           dns_record_name, expires_at, created_by
         ) values ($1, $2, 'dns_txt', 'pending', $3, $4,
                   now() + ($5 * interval '1 minute'), $6)
         returning id, organization_id, target_id, method, status,
                   token_hash, dns_record_name, attempt_count, expires_at,
                   last_checked_at, verified_at, created_at`,
        [organizationId, targetId, tokenHash, dnsRecordName, ttlMinutes, createdBy],
      );

      const challenge = inserted.rows[0];
      await client.query(
        `update public.targets
            set verification_state = 'pending',
                verification_metadata = jsonb_build_object(
                  'method', 'dns_txt',
                  'challengeId', $3::text,
                  'recordName', $4::text
                ),
                updated_at = now()
          where organization_id = $1 and id = $2`,
        [organizationId, targetId, challenge.id, dnsRecordName],
      );

      await client.query('commit');
      return mapChallenge(challenge);
    } catch (error) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] Target challenge creation rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function getPendingChallenge(organizationId, targetId) {
    const result = await pool.query(
      `select id, organization_id, target_id, method, status,
              token_hash, dns_record_name, attempt_count, expires_at,
              last_checked_at, verified_at, created_at
         from public.target_verification_challenges
        where organization_id = $1
          and target_id = $2
          and status = 'pending'
        order by created_at desc
        limit 1`,
      [organizationId, targetId],
    );
    return result.rowCount > 0 ? mapChallenge(result.rows[0]) : null;
  }

  async function recordAttempt({ organizationId, targetId, challengeId, matched }) {
    const client = await pool.connect();
    try {
      await client.query('begin');

      const locked = await client.query(
        `select id, organization_id, target_id, method, status,
                token_hash, dns_record_name, attempt_count, expires_at,
                last_checked_at, verified_at, created_at,
                (expires_at <= now()) as is_expired
           from public.target_verification_challenges
          where id = $1
            and organization_id = $2
            and target_id = $3
          for update`,
        [challengeId, organizationId, targetId],
      );

      if (locked.rowCount === 0) {
        throw new HttpError(404, 'Verification challenge was not found.', 'VERIFICATION_CHALLENGE_NOT_FOUND');
      }

      const row = locked.rows[0];
      if (row.status !== 'pending') {
        await client.query('commit');
        return mapChallenge(row);
      }

      if (row.is_expired) {
        const expired = await client.query(
          `update public.target_verification_challenges
              set status = 'expired', last_checked_at = now(), updated_at = now()
            where id = $1
            returning id, organization_id, target_id, method, status,
                      token_hash, dns_record_name, attempt_count, expires_at,
                      last_checked_at, verified_at, created_at`,
          [challengeId],
        );
        await client.query(
          `update public.targets
              set verification_state = 'failed', updated_at = now()
            where organization_id = $1 and id = $2 and verification_state = 'pending'`,
          [organizationId, targetId],
        );
        await client.query('commit');
        return mapChallenge(expired.rows[0]);
      }

      const nextAttempt = row.attempt_count + 1;
      const nextStatus = matched
        ? 'verified'
        : nextAttempt >= MAX_VERIFICATION_ATTEMPTS
          ? 'failed'
          : 'pending';

      const updated = await client.query(
        `update public.target_verification_challenges
            set status = $2,
                attempt_count = $3,
                last_checked_at = now(),
                verified_at = case when $2 = 'verified' then now() else verified_at end,
                updated_at = now()
          where id = $1
          returning id, organization_id, target_id, method, status,
                    token_hash, dns_record_name, attempt_count, expires_at,
                    last_checked_at, verified_at, created_at`,
        [challengeId, nextStatus, nextAttempt],
      );

      if (nextStatus === 'verified') {
        await client.query(
          `update public.targets
              set verification_state = 'verified',
                  verification_metadata = jsonb_build_object(
                    'method', 'dns_txt',
                    'challengeId', $3::text,
                    'verifiedAt', now()
                  ),
                  updated_at = now()
            where organization_id = $1 and id = $2`,
          [organizationId, targetId, challengeId],
        );
      } else if (nextStatus === 'failed') {
        await client.query(
          `update public.targets
              set verification_state = 'failed', updated_at = now()
            where organization_id = $1 and id = $2`,
          [organizationId, targetId],
        );
      }

      await client.query('commit');
      return mapChallenge(updated.rows[0]);
    } catch (error) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] Target verification attempt rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    createDnsChallenge,
    getPendingChallenge,
    getTarget,
    recordAttempt,
  };
}

module.exports = {
  createTargetVerificationRepository,
  mapChallenge,
};
