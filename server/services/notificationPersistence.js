const { getPostgresPool } = require('../database/postgres');
const { createMembershipRepository } = require('../repositories/membershipRepository');
const { createNotificationRepository } = require('../repositories/notificationRepository');
const { createNotificationService } = require('./notificationService');
const { createOrganizationAuthorizationService } = require('./organizationAuthorization');

let notificationServices = null;

function createNotificationPersistenceServices() {
  const pool = getPostgresPool();
  const membershipRepository = createMembershipRepository(pool);
  const organizationAuthorization = createOrganizationAuthorizationService(membershipRepository);
  const notificationRepository = createNotificationRepository(pool);
  const notificationService = createNotificationService({
    organizationAuthorization,
    notificationRepository,
  });
  return {
    notificationRepository,
    notificationService,
    organizationAuthorization,
  };
}

function getNotificationPersistenceServices() {
  if (!notificationServices) notificationServices = createNotificationPersistenceServices();
  return notificationServices;
}

module.exports = {
  createNotificationPersistenceServices,
  getNotificationPersistenceServices,
};
