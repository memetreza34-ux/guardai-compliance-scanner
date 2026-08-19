const scanContract = require('../../shared/scan-contract.json');
const { getAssetRuntimeProviders } = require('../asset/runtimeProviders');
const { config } = require('../config');
const { getPostgresPool } = require('../database/postgres');
const { createScanSubmissionService } = require('../domain/scanSubmission');
const { createAiGovernanceRepository } = require('../repositories/aiGovernanceRepository');
const { createAssetIngestionRepository } = require('../repositories/assetIngestionRepository');
const { createAssetUploadRepository } = require('../repositories/assetUploadRepository');
const { createAuditRepository } = require('../repositories/auditRepository');
const { createBillingRepository } = require('../repositories/billingRepository');
const { createEntitlementRepository } = require('../repositories/entitlementRepository');
const { createJobRepository } = require('../repositories/jobRepository');
const { createMembershipRepository } = require('../repositories/membershipRepository');
const { createOrganizationRepository } = require('../repositories/organizationRepository');
const { createReportRepository } = require('../repositories/reportRepository');
const { createScanReadRepository } = require('../repositories/scanReadRepository');
const { createScanRepository } = require('../repositories/scanRepository');
const { createTargetRepository } = require('../repositories/targetRepository');
const { createTargetVerificationRepository } = require('../repositories/targetVerificationRepository');
const { createTrustPublicationRepository } = require('../repositories/trustPublicationRepository');
const stripeProvider = require('../billing/stripeProvider');
const { createAiGovernanceService } = require('./aiGovernanceService');
const { createAssetUploadService } = require('./assetUploadService');
const { createAuditService } = require('./auditService');
const { createBillingService } = require('./billingService');
const { createJobFailureService } = require('./jobFailureService');
const { createOrganizationAuthorizationService } = require('./organizationAuthorization');
const { createOrganizationService } = require('./organizationService');
const { createReportService } = require('./reportService');
const { createTargetService } = require('./targetService');
const { createTargetVerificationService } = require('./targetVerificationService');
const { createTrustPublicationService } = require('./trustPublicationService');

let services = null;

function createPersistenceServices() {
  const pool = getPostgresPool();
  const auditRepository = createAuditRepository(pool);
  const billingRepository = createBillingRepository(pool);
  const entitlementRepository = createEntitlementRepository(pool);
  const jobRepository = createJobRepository(pool);
  const jobFailureService = createJobFailureService({ pool, jobRepository });
  const membershipRepository = createMembershipRepository(pool);
  const organizationAuthorization = createOrganizationAuthorizationService(membershipRepository);

  const aiGovernanceRepository = createAiGovernanceRepository(pool);
  const aiGovernanceService = createAiGovernanceService({
    organizationAuthorization,
    aiGovernanceRepository,
  });

  const assetUploadRepository = createAssetUploadRepository(pool);
  const assetIngestionRepository = createAssetIngestionRepository(pool);
  const assetProviders = getAssetRuntimeProviders();
  const assetUploadService = createAssetUploadService({
    organizationAuthorization,
    assetUploadRepository,
    ...assetProviders,
    limits: {
      maxUploadBytes: config.maxUploadBytes,
      uploadSessionTtlSeconds: 15 * 60,
      maxExtractedTextChars: config.maxExtractedTextChars,
      maxParserSeconds: 30,
    },
  });

  const auditService = createAuditService({ auditRepository, organizationAuthorization });
  const billingService = createBillingService({
    billingRepository,
    organizationAuthorization,
    stripeProvider,
  });
  const organizationRepository = createOrganizationRepository(pool);
  const organizationService = createOrganizationService({ organizationRepository });
  const scanRepository = createScanRepository(pool, { entitlementRepository });
  const scanReadRepository = createScanReadRepository(pool);
  const reportRepository = createReportRepository(pool);
  const reportService = createReportService({
    organizationAuthorization,
    reportRepository,
    scanReadRepository,
  });
  const trustPublicationRepository = createTrustPublicationRepository(pool);
  const trustPublicationService = createTrustPublicationService({
    organizationAuthorization,
    reportService,
    trustPublicationRepository,
  });
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
    aiGovernanceRepository,
    aiGovernanceService,
    assetIngestionRepository,
    assetUploadRepository,
    assetUploadService,
    auditRepository,
    auditService,
    billingRepository,
    billingService,
    entitlementRepository,
    jobFailureService,
    jobRepository,
    membershipRepository,
    organizationAuthorization,
    organizationRepository,
    organizationService,
    pool,
    reportRepository,
    reportService,
    scanReadRepository,
    scanRepository,
    scanSubmission,
    targetRepository,
    targetService,
    targetVerificationRepository,
    targetVerificationService,
    trustPublicationRepository,
    trustPublicationService,
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
