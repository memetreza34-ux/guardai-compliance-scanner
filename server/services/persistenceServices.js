const scanContract = require('../../shared/scan-contract.json');
const { config } = require('../config');
const { getPostgresPool } = require('../database/postgres');
const { createScanSubmissionService } = require('../domain/scanSubmission');
const { createAuditRepository } = require('../repositories/auditRepository');
const { createEntitlementRepository } = require('../repositories/entitlementRepository');
const { createJobRepository } = require('../repositories/jobRepository');
const { createMembershipRepository } = require('../repositories/membershipRepository');
const { createOrganizationRepository } = require('../repositories/organizationRepository');
const { createScanReadRepository } = require('../repositories/scanReadRepository');
const { createScanRepository } = require('../repositories/scanRepository');
const { createTargetRepository } = require('../repositories/targetRepository');
const { createTargetVerificationRepository } = require('../repositories/targetVerificationRepository');
const { createAuditService } = require('./auditService');
const { createJobFailureService } = require('./jobFailureService');
const { createOrganizationAuthorizationService } = require('./organizationAuthorization');
const { createOrganizationService } = require('./organizationService');
const { createTargetService } = require('./targetService');
const { createTargetVerificationService } = require('./targetVerificationService');

let services = null;

function createPersistenceServices() {
  const pool = getPostgresPool();
  const auditRepository = createAuditRepository(pool);
  const entitlementRepository = createEntitlementRepository(pool);
  const jobRepository = createJobRepository(pool);
  const jobFailureService = createJobFailureService({ pool, jobRepository });
  const membershipRepository = createMembershipRepository(pool);
  const organizationAuthorization = createOrganizationAuthorizationService(membershipRepository);
  const auditService = createAuditService({ auditRepository, organizationAuthorization });
  const organizationRepository = createOrganizationRepository(pool);
  const organizationService = createOrganizationService({ organizationRepository });
  const scanRepository = createScanRepository(pool);
  const scanReadRepository = createScanReadRepository(pool);
  const targetRepository = createTargetRepository(pool);
  const targetService = createTargetService({ organizationAuthorization, targetRepository });
  const targetVerificationRepository = createTargetVerificationRepository(pool);
  const targetVerificationService = createTargetVerificationService({
    organizationAuthorization,
    targetVerificationRepository,
  });
  const scanSubmission = createScanSubmissionService({
    organizationAuthorization,
    scanRepository,
    scannerVersion: config.scannerVersion,
    contractVersion: scanContract.version,
  });

  return {
    auditRepository,
    auditService,
    entitlementRepository,
    jobFailureService,
    jobRepository,
    membershipRepository,
    organizationAuthorization,
    organizationRepository,
    organizationService,
    pool,
    scanReadRepository,
    scanRepository,
    scanSubmission,
    targetRepository,
    targetService,
    targetVerificationRepository,
    targetVerificationService,
  };
}

function getPersistenceServices() {
  if (!services) {
    services = createPersistenceServices();
  }
  return services;
}

module.exports = {
  createPersistenceServices,
  getPersistenceServices,
};
