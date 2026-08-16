const { HttpError } = require('../lib/httpError');

function mapTargetRow(row) {
  return {
    id: row.id,
    organizationId: row.organization_id,
    type: row.type,
    displayName: row.display_name,
    canonicalUrl: row.canonical_url,
    provider: row.provider,
    verificationState: row.verification_state,
    verificationMetadata: row.verification_metadata || {},
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createTargetRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Target repository requires a PostgreSQL pool.');
  }

  async function createWebsiteTarget({ organizationId, userId, displayName, canonicalUrl }) {
    const client = await pool.connect();
    try {
      await client.query('begin');

      let insertResult;
      try {
        insertResult = await client.query(
          `insert into public.targets (
             organization_id, type, display_name, canonical_url,
             verification_state, verification_metadata, created_by
           ) values ($1, 'website', $2, $3, 'unverified', '{}'::jsonb, $4)
           returning id, organization_id, type, display_name, canonical_url,
                     provider, verification_state, verification_metadata,
                     created_by, created_at, updated_at`,
          [organizationId, displayName, canonicalUrl, userId],
        );
      } catch (error) {
        if (error?.code === '23505') {
          throw new HttpError(
            409,
            'This website target already exists in the organization.',
            'TARGET_ALREADY_EXISTS',
          );
        }
        throw error;
      }

      const target = insertResult.rows[0];
      await client.query(
        `insert into public.audit_events (
           organization_id, actor_id, action, target_type, target_id, metadata
         ) values ($1, $2, 'target.created', 'target', $3, $4::jsonb)`,
        [
          organizationId,
          userId,
          target.id,
          JSON.stringify({ type: 'website', canonicalUrl }),
        ],
      );

      await client.query('commit');
      return mapTargetRow(target);
    } catch (error) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] Target creation rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function listTargets(organizationId) {
    const result = await pool.query(
      `select id, organization_id, type, display_name, canonical_url,
              provider, verification_state, verification_metadata,
              created_by, created_at, updated_at
         from public.targets
        where organization_id = $1
        order by created_at asc, id asc`,
      [organizationId],
    );

    return result.rows.map(mapTargetRow);
  }

  async function getTarget(organizationId, targetId) {
    const result = await pool.query(
      `select id, organization_id, type, display_name, canonical_url,
              provider, verification_state, verification_metadata,
              created_by, created_at, updated_at
         from public.targets
        where organization_id = $1 and id = $2
        limit 1`,
      [organizationId, targetId],
    );

    return result.rowCount > 0 ? mapTargetRow(result.rows[0]) : null;
  }

  return {
    createWebsiteTarget,
    getTarget,
    listTargets,
  };
}

module.exports = {
  createTargetRepository,
  mapTargetRow,
};