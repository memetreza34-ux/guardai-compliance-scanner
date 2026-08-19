const sourceRegistry = require('../../shared/legal-sources/eu-ai-act-guided-review-v1.json');
const {
  buildAiGovernanceGuidedReviewEvidence,
  normalizeAiSystemDeclaration,
} = require('../domain/aiGovernanceEvidence');
const { legalSourceIdForKey } = require('../domain/aiGovernanceLegalSources');
const { HttpError } = require('../lib/httpError');

function createAiGovernanceService({ organizationAuthorization, aiGovernanceRepository }) {
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('AI Governance service requires Organization authorization.');
  }
  if (!aiGovernanceRepository) {
    throw new TypeError('AI Governance service requires persistence repository.');
  }

  async function createSystem({ organizationId, userId, declaration }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'member');
    return aiGovernanceRepository.createSystemProfile({
      organizationId,
      createdBy: userId,
      declaration: normalizeAiSystemDeclaration(declaration),
    });
  }

  async function updateSystem({ organizationId, userId, systemId, declaration }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'member');
    const updated = await aiGovernanceRepository.updateSystemProfile({
      organizationId,
      systemId,
      declaration: normalizeAiSystemDeclaration(declaration),
    });
    if (!updated) {
      throw new HttpError(404, 'AI System profile was not found or is archived.', 'AI_SYSTEM_NOT_FOUND');
    }
    return updated;
  }

  async function archiveSystem({ organizationId, userId, systemId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'admin');
    const archived = await aiGovernanceRepository.archiveSystemProfile({ organizationId, systemId });
    if (!archived) {
      throw new HttpError(404, 'AI System profile was not found.', 'AI_SYSTEM_NOT_FOUND');
    }
    return archived;
  }

  async function listSystems({ organizationId, userId, includeArchived = false }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    return aiGovernanceRepository.listSystemProfiles(organizationId, { includeArchived });
  }

  async function getSystem({ organizationId, userId, systemId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const system = await aiGovernanceRepository.getSystemProfile(organizationId, systemId);
    if (!system) throw new HttpError(404, 'AI System profile was not found.', 'AI_SYSTEM_NOT_FOUND');
    return system;
  }

  async function createReview({ organizationId, userId, systemId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'member');
    const system = await aiGovernanceRepository.getSystemProfile(organizationId, systemId);
    if (!system || system.archivedAt) {
      throw new HttpError(404, 'AI System profile was not found or is archived.', 'AI_SYSTEM_NOT_FOUND');
    }

    const evidence = buildAiGovernanceGuidedReviewEvidence(system);
    const reviewItems = evidence.normalizedData.reviewItems.map((item) => ({
      itemKey: item.key,
      legalSourceId: legalSourceIdForKey(item.legalSource.key),
      documentationState: item.documentationState,
      trigger: item.trigger,
    }));

    return aiGovernanceRepository.createReviewWithItems({
      organizationId,
      aiSystemId: systemId,
      sourceRegistryId: sourceRegistry.registryId,
      sourceRegistryVersion: sourceRegistry.version,
      reviewItems,
    });
  }

  async function listReviews({ organizationId, userId, systemId = null }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    return aiGovernanceRepository.listReviews(organizationId, systemId);
  }

  async function getReview({ organizationId, userId, reviewId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const review = await aiGovernanceRepository.getReview(organizationId, reviewId);
    if (!review) {
      throw new HttpError(404, 'AI Governance review was not found.', 'AI_GOVERNANCE_REVIEW_NOT_FOUND');
    }
    return review;
  }

  async function submitReview({ organizationId, userId, reviewId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'member');
    return aiGovernanceRepository.transitionReview({
      organizationId,
      reviewId,
      action: 'submit',
      actorId: userId,
    });
  }

  async function markReviewed({ organizationId, userId, reviewId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'admin');
    return aiGovernanceRepository.transitionReview({
      organizationId,
      reviewId,
      action: 'review',
      actorId: userId,
    });
  }

  async function reopenReview({ organizationId, userId, reviewId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'admin');
    return aiGovernanceRepository.transitionReview({
      organizationId,
      reviewId,
      action: 'reopen',
      actorId: userId,
    });
  }

  return {
    archiveSystem,
    createReview,
    createSystem,
    getReview,
    getSystem,
    listReviews,
    listSystems,
    markReviewed,
    reopenReview,
    submitReview,
    updateSystem,
  };
}

module.exports = { createAiGovernanceService };
