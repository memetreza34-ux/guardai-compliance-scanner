const { HttpError } = require('../lib/httpError');

function mapLeadReceipt(row) {
  return {
    id: row.id,
    status: row.status,
    marketingConsentStatus: row.marketing_consent_status,
    contactRequestedAt: row.contact_requested_at,
    retentionExpiresAt: row.retention_expires_at,
  };
}

function createLeadRepository(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('Lead repository requires a PostgreSQL pool.');
  }

  async function createLead(input) {
    const result = await pool.query(
      `insert into public.lead_submissions (
         idempotency_key,
         submission_fingerprint,
         email,
         name,
         company,
         message,
         source,
         privacy_notice_version,
         marketing_consent_status,
         retention_expires_at
       ) values (
         $1, $2, $3, $4, $5, $6, $7, $8, 'not_requested', $9
       )
       on conflict (idempotency_key) do nothing
       returning id, submission_fingerprint, status, marketing_consent_status,
                 contact_requested_at, retention_expires_at`,
      [
        input.idempotencyKey,
        input.submissionFingerprint,
        input.email,
        input.name,
        input.company,
        input.message,
        input.source,
        input.privacyNoticeVersion,
        input.retentionExpiresAt,
      ],
    );

    if (result.rowCount > 0) {
      return { created: true, receipt: mapLeadReceipt(result.rows[0]) };
    }

    const existing = await pool.query(
      `select id, submission_fingerprint, status, marketing_consent_status,
              contact_requested_at, retention_expires_at
         from public.lead_submissions
        where idempotency_key = $1
        limit 1`,
      [input.idempotencyKey],
    );

    if (existing.rowCount === 0) {
      throw new HttpError(409, 'Lead submission conflicted with another request.', 'LEAD_SUBMISSION_CONFLICT');
    }
    if (existing.rows[0].submission_fingerprint !== input.submissionFingerprint) {
      throw new HttpError(
        409,
        'Lead Idempotency-Key was already used for different content.',
        'LEAD_IDEMPOTENCY_KEY_REUSED',
      );
    }

    return { created: false, receipt: mapLeadReceipt(existing.rows[0]) };
  }

  return { createLead };
}

module.exports = {
  createLeadRepository,
  mapLeadReceipt,
};
