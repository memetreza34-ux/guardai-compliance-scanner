const { HttpError } = require('../lib/httpError');

function mapOrganizationRow(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createOrganizationRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('Organization repository requires a PostgreSQL pool.');
  }

  async function createOrganizationWithOwner({ name, slug, userId }) {
    const client = await pool.connect();
    try {
      await client.query('begin');

      let organizationResult;
      try {
        organizationResult = await client.query(
          `insert into public.organizations (name, slug, created_by)
           values ($1, $2, $3)
           returning id, name, slug, created_at, updated_at`,
          [name, slug, userId],
        );
      } catch (error) {
        if (error?.code === '23505') {
          throw new HttpError(
            409,
            'Organization identifier collided with an existing workspace. Please retry.',
            'ORGANIZATION_SLUG_COLLISION',
          );
        }
        throw error;
      }

      const organization = organizationResult.rows[0];

      await client.query(
        `insert into public.memberships (organization_id, user_id, role)
         values ($1, $2, 'owner')`,
        [organization.id, userId],
      );

      await client.query(
        `insert into public.subscriptions (
           organization_id, provider, plan, status
         ) values ($1, 'internal', 'free', 'active')`,
        [organization.id],
      );

      await client.query(
        `insert into public.audit_events (
           organization_id, actor_id, action, target_type, target_id, metadata
         ) values ($1, $2, 'organization.created', 'organization', $1::text, $3::jsonb)`,
        [organization.id, userId, JSON.stringify({ initialRole: 'owner' })],
      );

      await client.query('commit');
      return mapOrganizationRow({ ...organization, role: 'owner' });
    } catch (error) {
      try {
        await client.query('rollback');
      } catch (rollbackError) {
        console.error('[Database] Organization creation rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function listOrganizationsForUser(userId) {
    const result = await pool.query(
      `select o.id, o.name, o.slug, o.created_at, o.updated_at, m.role
         from public.memberships m
         join public.organizations o on o.id = m.organization_id
        where m.user_id = $1
        order by o.created_at asc, o.id asc`,
      [userId],
    );

    return result.rows.map(mapOrganizationRow);
  }

  return {
    createOrganizationWithOwner,
    listOrganizationsForUser,
  };
}

module.exports = {
  createOrganizationRepository,
  mapOrganizationRow,
};