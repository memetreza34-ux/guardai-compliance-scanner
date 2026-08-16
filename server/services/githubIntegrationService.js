const { sha256Hex } = require('../lib/evidenceIntegrity');
const {
  createGitHubInstallationState,
  normalizeGitHubDeliveryId,
  normalizeGitHubInstallationId,
} = require('../domain/githubIntegration');
const { HttpError } = require('../lib/httpError');

const GITHUB_WEBHOOK_EVENTS = new Set(['installation', 'installation_repositories']);

function parseSignedJson(rawBody) {
  if (!Buffer.isBuffer(rawBody)) {
    throw new HttpError(400, 'GitHub webhook body must be raw bytes.', 'GITHUB_WEBHOOK_BODY_INVALID');
  }
  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new HttpError(400, 'GitHub webhook body is not valid JSON.', 'GITHUB_WEBHOOK_BODY_INVALID');
  }
}

function installationIdFromPayload(payload) {
  return normalizeGitHubInstallationId(payload?.installation?.id);
}

function createGitHubIntegrationService({
  organizationAuthorization,
  githubRepository,
  githubProvider,
}) {
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('GitHub integration service requires Organization authorization.');
  }
  if (!githubRepository) throw new TypeError('GitHub integration service requires repository.');
  if (!githubProvider) throw new TypeError('GitHub integration service requires provider.');

  async function startInstallation({ organizationId, userId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'admin');
    const state = createGitHubInstallationState();
    await githubRepository.createInstallationState({
      organizationId,
      userId,
      tokenHash: state.tokenHash,
      expiresAt: state.expiresAt,
    });
    return {
      url: githubProvider.getInstallationUrl(state.token),
      expiresAt: state.expiresAt,
    };
  }

  async function completeInstallation({ stateToken, installationId }) {
    if (typeof stateToken !== 'string' || stateToken.length < 20 || stateToken.length > 200) {
      throw new HttpError(400, 'GitHub installation state is invalid.', 'GITHUB_INSTALLATION_STATE_INVALID');
    }
    const tokenHash = sha256Hex(stateToken);
    const state = await githubRepository.getValidInstallationState(tokenHash);
    if (!state) {
      throw new HttpError(409, 'GitHub installation state is expired or already used.', 'GITHUB_INSTALLATION_STATE_INVALID');
    }

    const providerInstallation = await githubProvider.getInstallation(
      normalizeGitHubInstallationId(installationId),
    );
    return githubRepository.consumeStateAndLinkInstallation({
      stateId: state.id,
      installation: providerInstallation,
    });
  }

  async function getStatus({ organizationId, userId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    return githubRepository.getActiveInstallation(organizationId);
  }

  async function listRepositories({ organizationId, userId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const installation = await githubRepository.getActiveInstallation(organizationId);
    if (!installation || installation.status !== 'active') {
      throw new HttpError(409, 'GitHub App installation is not active.', 'GITHUB_INSTALLATION_NOT_ACTIVE');
    }
    return githubProvider.listInstallationRepositories(installation.installationId);
  }

  async function processWebhook({ rawBody, signatureHeader, deliveryId, eventType }) {
    githubProvider.verifyWebhook(rawBody, signatureHeader);
    const normalizedDeliveryId = normalizeGitHubDeliveryId(deliveryId);
    if (typeof eventType !== 'string' || eventType.length < 1 || eventType.length > 160) {
      throw new HttpError(400, 'GitHub webhook event type is invalid.', 'GITHUB_WEBHOOK_EVENT_INVALID');
    }

    const claim = await githubRepository.claimWebhookEvent({
      deliveryId: normalizedDeliveryId,
      eventType,
      payloadHash: sha256Hex(rawBody),
    });
    if (!claim.claimed) {
      return { duplicate: true, status: claim.status };
    }

    try {
      if (!GITHUB_WEBHOOK_EVENTS.has(eventType)) {
        await githubRepository.finalizeWebhookEvent({
          deliveryId: normalizedDeliveryId,
          status: 'ignored',
        });
        return { duplicate: false, ignored: true };
      }

      const payload = parseSignedJson(rawBody);
      const installationId = installationIdFromPayload(payload);
      const existing = await githubRepository.findByProviderInstallationId(installationId);
      if (!existing) {
        await githubRepository.finalizeWebhookEvent({
          deliveryId: normalizedDeliveryId,
          status: 'ignored',
        });
        return { duplicate: false, ignored: true };
      }

      if (eventType === 'installation' && payload.action === 'deleted') {
        const updated = await githubRepository.updateInstallationLifecycle({
          installationId,
          status: 'deleted',
          account: null,
          repositorySelection: null,
        });
        await githubRepository.finalizeWebhookEvent({
          deliveryId: normalizedDeliveryId,
          status: 'processed',
          organizationId: existing.organizationId,
        });
        return { duplicate: false, ignored: false, status: updated?.status || 'deleted' };
      }

      const current = await githubProvider.getInstallation(installationId);
      const status = current.suspendedAt ? 'suspended' : 'active';
      const account = {
        id: current.accountId,
        login: current.accountLogin,
        type: current.accountType,
      };
      const updated = await githubRepository.updateInstallationLifecycle({
        installationId,
        status,
        account,
        repositorySelection: current.repositorySelection,
      });
      if (eventType === 'installation_repositories') {
        await githubRepository.touchInstallation(installationId, current.repositorySelection);
      }
      await githubRepository.finalizeWebhookEvent({
        deliveryId: normalizedDeliveryId,
        status: 'processed',
        organizationId: existing.organizationId,
      });
      return { duplicate: false, ignored: false, status: updated?.status || status };
    } catch (error) {
      await githubRepository.finalizeWebhookEvent({
        deliveryId: normalizedDeliveryId,
        status: 'failed',
        error,
      });
      throw error;
    }
  }

  return {
    completeInstallation,
    getStatus,
    listRepositories,
    processWebhook,
    startInstallation,
  };
}

module.exports = {
  createGitHubIntegrationService,
  GITHUB_WEBHOOK_EVENTS,
  installationIdFromPayload,
  parseSignedJson,
};
