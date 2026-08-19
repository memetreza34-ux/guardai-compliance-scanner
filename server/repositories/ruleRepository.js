const { HttpError } = require('../lib/httpError');

function normalizeRuleLimit(value) {
  if (value === undefined || value === null || value === '') return 50;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new HttpError(400, 'Rule limit must be an integer between 1 and 100.', 'INVALID_RULE_LIMIT');
  }
  return parsed;
}

function mapRule(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    currentVersion: row.current_version,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRuleVersion(row) {
  return {
    ruleId: row.rule_id,
    version: row.version,
    implementationVersion: row.implementation_version,
    legalSourceIds: row.legal_source_ids || [],
    definition: row.definition || {},
    definitionHash: row.definition_hash,
    changedAt: row.changed_at,
  };
}

function createRuleRepository(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('Rule repository requires a PostgreSQL pool.');
  }

  async function listRules({ category = null, active = true, limit }) {
    const pageSize = normalizeRuleLimit(limit);
    const params = [];
    const where = [];
    if (category) {
      params.push(category);
      where.push(`category = $${params.length}`);
    }
    if (typeof active === 'boolean') {
      params.push(active);
      where.push(`active = $${params.length}`);
    }
    params.push(pageSize);

    const result = await pool.query(
      `select id, category, title, current_version, active, created_at, updated_at
         from public.rules
        ${where.length > 0 ? `where ${where.join(' and ')}` : ''}
        order by category asc, id asc
        limit $${params.length}`,
      params,
    );
    return result.rows.map(mapRule);
  }

  async function getRule(ruleId) {
    const result = await pool.query(
      `select id, category, title, current_version, active, created_at, updated_at
         from public.rules
        where id = $1
        limit 1`,
      [ruleId],
    );
    return result.rowCount > 0 ? mapRule(result.rows[0]) : null;
  }

  async function listRuleVersions(ruleId) {
    const result = await pool.query(
      `select rule_id, version, implementation_version,
              legal_source_ids, definition, definition_hash, changed_at
         from public.rule_versions
        where rule_id = $1
        order by version desc`,
      [ruleId],
    );
    return result.rows.map(mapRuleVersion);
  }

  async function getRuleVersion(ruleId, version) {
    const result = await pool.query(
      `select rule_id, version, implementation_version,
              legal_source_ids, definition, definition_hash, changed_at
         from public.rule_versions
        where rule_id = $1 and version = $2
        limit 1`,
      [ruleId, version],
    );
    return result.rowCount > 0 ? mapRuleVersion(result.rows[0]) : null;
  }

  return {
    getRule,
    getRuleVersion,
    listRules,
    listRuleVersions,
  };
}

module.exports = {
  createRuleRepository,
  mapRule,
  mapRuleVersion,
  normalizeRuleLimit,
};
