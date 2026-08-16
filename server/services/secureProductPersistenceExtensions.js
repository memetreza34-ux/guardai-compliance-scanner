const { createEvidenceRepository } = require('../repositories/evidenceRepository');
const { createFindingRepository } = require('../repositories/findingRepository');
const { createRuleRepository } = require('../repositories/ruleRepository');
const { createEvidenceService } = require('./evidenceService');
const { createFindingLifecycleService } = require('./findingLifecycleService');
const { createRuleService } = require('./ruleService');
const { getPersistenceServices } = require('./persistenceServices');

let extended = null;

function getSecureProductPersistenceServices() {
  if (extended) return extended;

  const base = getPersistenceServices();
  const evidenceRepository = createEvidenceRepository(base.pool);
  const findingRepository = createFindingRepository(base.pool);
  const ruleRepository = createRuleRepository(base.pool);
  const evidenceService = createEvidenceService({
    evidenceRepository,
    organizationAuthorization: base.organizationAuthorization,
  });
  const findingService = createFindingLifecycleService({
    findingRepository,
    organizationAuthorization: base.organizationAuthorization,
  });
  const ruleService = createRuleService({ ruleRepository });

  Object.assign(base, {
    evidenceRepository,
    evidenceService,
    findingRepository,
    findingService,
    ruleRepository,
    ruleService,
  });

  extended = base;
  return extended;
}

module.exports = { getSecureProductPersistenceServices };
