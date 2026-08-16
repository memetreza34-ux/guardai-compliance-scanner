function createMembershipRepository(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('Membership repository requires a PostgreSQL pool.');
  }

  async function getMembership(organizationId, userId) {
    const result = await pool.query(
      `select organization_id, user_id, role
       from public.memberships
       where organization_id = $1
         and user_id = $2
       limit 1`,
      [organizationId, userId],
    );

    if (result.rowCount === 0) return null;

    const row = result.rows[0];
    return {
      organizationId: row.organization_id,
      userId: row.user_id,
      role: row.role,
    };
  }

  return { getMembership };
}

module.exports = { createMembershipRepository };
