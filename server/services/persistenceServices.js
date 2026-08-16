const scanContract = require('../../shared/scan-contract.json');
const { config } = require('../config');
const { getPostgresPool } = require('../database/postgres');
const { createScanSubmissionService } = require('../domain/scanSubmission');
const { createMembershipRepository } = require('../repositories/membershipRepository');
const { createScanReadRepository } = require('../repositories/scanReadRepository');
const { createScanRepository } = require('../repositories/scanRepository');
const { createOrganizationAuthorizationService } = require('./organizationAuthorization');

let services = null;

function createPersistenceServices() {
  const pool = getPostgresPool();
  const membershipRepository = createMembershipRepository(pool);
  const organizationAuthorization = createOrganizationAuthorizationService(membershipRepository);
  const scanRepository = createScanRepository(pool);
  const scanReadRepository = createScanReadRepository(pool);
  const scanSubmission = createScanSubmissionService({
    organizationAuthorization,
    scanRepository,
    scannerVersion: config.scannerVersion,
    contractVersion: scanContract.version,
  });

  return {
    membershipRepository,
    organizationAuthorization,
    pool,
    scanReadRepository,
    scanRepository,
    scanSubmission,
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
