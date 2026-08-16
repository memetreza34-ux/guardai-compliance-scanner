const scanContract = require('../../shared/scan-contract.json');
const { config } = require('../config');
const { getPostgresPool } = require('../database/postgres');
const { createMembershipRepository } = require('../repositories/membershipRepository');
const { createMonitorRepository } = require('../repositories/monitorRepository');
const { createScanRepository } = require('../repositories/scanRepository');
const { createMonitorSchedulerService } = require('./monitorSchedulerService');
const { createMonitoringService } = require('./monitoringService');
const { createOrganizationAuthorizationService } = require('./organizationAuthorization');

let monitoringServices = null;

function createMonitoringPersistenceServices() {
  const pool = getPostgresPool();
  const membershipRepository = createMembershipRepository(pool);
  const organizationAuthorization = createOrganizationAuthorizationService(membershipRepository);
  const monitorRepository = createMonitorRepository(pool);
  const scanRepository = createScanRepository(pool);
  const monitoringService = createMonitoringService({ organizationAuthorization, monitorRepository });
  const monitorSchedulerService = createMonitorSchedulerService({
    monitorRepository,
    scanRepository,
    scannerVersion: config.scannerVersion,
    contractVersion: scanContract.version,
  });

  return {
    monitorRepository,
    monitorSchedulerService,
    monitoringService,
    organizationAuthorization,
    pool,
    scanRepository,
  };
}

function getMonitoringPersistenceServices() {
  if (!monitoringServices) monitoringServices = createMonitoringPersistenceServices();
  return monitoringServices;
}

module.exports = {
  createMonitoringPersistenceServices,
  getMonitoringPersistenceServices,
};
