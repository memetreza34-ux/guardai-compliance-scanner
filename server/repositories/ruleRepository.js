const { HttpError } = require('../lib/httpError');
const {
  decodeTimestampIdCursor,
  encodeTimestampIdCursor,
} = require('../lib/paginationCursor');

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
    framework: row.framework,
    category: row.category,
    controlKey: row.control_key,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRuleVersion(row) {
  return {
    ruleId: row.rule_id,
    version: row.version,
    implementationVersion: row.implementation_version,
    rationale: row.rationale,
    legalSourceIds: row.legal_source_ids || [],
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    config: row.config || {},
    createdAt: row.created_at,
  };
}

function createRuleRepository(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('Rule repository requires a PostgreSQL pool.');
  }

  async function listRules({ framework = null, status = 'active', limit }) {
    const pageSize = normalizeRuleLimit(limit);
    const params = [];
    const where = [];
    if (framework) {
      params.push(framework);
      where.push(`framework = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    params.push(pageSize);

    const result = await pool.query(
      `select id, framework, category, control_key, title, status, created_at, updated_at
         from public.rules
        ${where.length > 0 ? `where ${where.join(' and ')}` : ''}
        order by framework asc, category asc, id asc
        limit $${params.length}`,
      params,
    );
    return result.rows.map(mapRule);
  }

  async function getRule(ruleId) {
    const result = await pool.query(
      `select id, framework, category, control_key, title, status, created_at, updated_at
         from public.rules
        where id = $1
        limit 1`,
      [ruleId],
    );
    return result.rowCount > 0 ? mapRule(result.rows[0]) : null;
  }

  async function listRuleVersions(ruleId) {
    const result = await pool.query(
      `select rule_id, version, implementation_version, rationale,
              legal_source_ids, effective_from, effective_to, config, created_at
         from public.rule_versions
        where rule_id = $1
        order by version desc`,
      [ruleId],
    );
    return result.rows.map(mapRuleVersion);
  }

  async function getRuleVersion(ruleId, version) {
    const result = await pool.query(
      `select rule_id, version, implementation_version, rationale,
              legal_source_ids, effective_from, effective_to, config, created_at
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