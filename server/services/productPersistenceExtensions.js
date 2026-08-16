const { createEvidenceRepository } = require('../repositories/evidenceRepository');
const { createFindingRepository } = require('../repositories/findingRepository');
const { createRuleRepository } = require('../repositories/ruleRepository');
const { createEvidenceService } = require('./evidenceService');
const { createFindingService } = require('./findingService');
const { createRuleService } = require('./ruleService');
const { getPersistenceServices } = require('./persistenceServices');

let extended = null;

function getProductPersistenceServices() {
  if (extended) return extended;

  const base = getPersistenceServices();
  const evidenceRepository = createEvidenceRepository(base.pool);
  const findingRepository = createFindingRepository(base.pool);
  const ruleRepository = createRuleRepository(base.pool);
  const evidenceService = createEvidenceService({
    evidenceRepository,
    organizationAuthorization: base.organizationAuthorization,
  });
  const findingService = createFindingService({
    findingRepository,
    organizationAuthorization: base.organizationAuthorization,
  });
  const ruleService = createRuleService({ ruleRepository });

  // Existing route modules resolve the canonical persistence object per request.
  // Extending that singleton keeps one pool/authorization boundary until these
  // repositories are folded into persistenceServices.js after clean validation.
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

module.exports = { getProductPersistenceServices };
