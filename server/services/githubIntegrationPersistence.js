const { getPostgresPool } = require('../database/postgres');
const { requireGitHubProvider } = require('../integrations/githubRuntime');
const { createGitHubIntegrationRepository } = require('../repositories/githubIntegrationRepository');
const { createMembershipRepository } = require('../repositories/membershipRepository');
const { createGitHubIntegrationService } = require('./githubIntegrationService');
const { createOrganizationAuthorizationService } = require('./organizationAuthorization');

let githubServices = null;

function createGitHubIntegrationPersistenceServices() {
  const pool = getPostgresPool();
  const membershipRepository = createMembershipRepository(pool);
  const organizationAuthorization = createOrganizationAuthorizationService(membershipRepository);
  const githubRepository = createGitHubIntegrationRepository(pool);
  const githubProvider = requireGitHubProvider();
  const githubIntegrationService = createGitHubIntegrationService({
    organizationAuthorization,
    githubRepository,
    githubProvider,
  });
  return {
    githubIntegrationService,
    githubProvider,
    githubRepository,
    organizationAuthorization,
  };
}

function getGitHubIntegrationPersistenceServices() {
  if (!githubServices) githubServices = createGitHubIntegrationPersistenceServices();
  return githubServices;
}

module.exports = {
  createGitHubIntegrationPersistenceServices,
  getGitHubIntegrationPersistenceServices,
};
