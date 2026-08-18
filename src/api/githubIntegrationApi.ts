import {
  API_BASE_URL,
  API_VERSION_PREFIX,
  createAuthenticatedApiClient,
  GuardApiError,
  type AccessTokenProvider,
} from './apiClient';
import type {
  GitHubInstallSession,
  GitHubInstallation,
  GitHubInstallationCompletion,
  GitHubRepositorySummary,
} from '../types/githubIntegration';
import type { WorkspaceTarget } from '../types/workspace';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertHttpsUrl(value: unknown): string {
  if (typeof value !== 'string') {
    throw new GuardApiError('GitHub installation URL is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new GuardApiError('GitHub installation URL is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  if (parsed.protocol !== 'https:') {
    throw new GuardApiError('GitHub installation URL is not HTTPS.', 'INVALID_API_RESPONSE', 200);
  }
  return parsed.toString();
}

function requireRepositoryTarget(value: unknown): WorkspaceTarget {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.type !== 'repository' ||
    value.provider !== 'github' ||
    typeof value.displayName !== 'string' ||
    typeof value.verificationState !== 'string' ||
    !isRecord(value.verificationMetadata)
  ) {
    throw new GuardApiError('GitHub repository Target response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  return value as unknown as WorkspaceTarget;
}

async function parseResponse(response: Response): Promise<unknown> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GuardApiError('GuardAI GitHub integration returned invalid JSON.', 'INVALID_API_RESPONSE', response.status);
  }
  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : null;
    throw new GuardApiError(
      error && typeof error.message === 'string' ? error.message : 'GitHub integration request failed.',
      error && typeof error.code === 'string' ? error.code : 'GITHUB_INTEGRATION_REQUEST_FAILED',
      response.status,
      error?.details,
    );
  }
  return payload;
}

export function createGitHubIntegrationApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function getStatus(organizationId: string): Promise<GitHubInstallation | null> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/integrations/github`,
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('GitHub integration status is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    if (payload.integration === null) return null;
    if (!isRecord(payload.integration) || typeof payload.integration.installationId !== 'number') {
      throw new GuardApiError('GitHub integration status is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return payload.integration as unknown as GitHubInstallation;
  }

  async function startInstallation(organizationId: string): Promise<GitHubInstallSession> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/integrations/github/install-session`,
      { method: 'POST' },
    );
    if (!isRecord(payload) || !isRecord(payload.installation)) {
      throw new GuardApiError('GitHub installation session is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    const value = payload.installation;
    if (typeof value.expiresAt !== 'string') {
      throw new GuardApiError('GitHub installation session is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return { url: assertHttpsUrl(value.url), expiresAt: value.expiresAt };
  }

  async function listRepositories(organizationId: string): Promise<GitHubRepositorySummary[]> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/integrations/github/repositories`,
    );
    if (!isRecord(payload) || !Array.isArray(payload.repositories)) {
      throw new GuardApiError('GitHub repository list is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return payload.repositories.filter(isRecord).map((repository) => {
      if (typeof repository.id !== 'number' || typeof repository.fullName !== 'string') {
        throw new GuardApiError('GitHub repository list is invalid.', 'INVALID_API_RESPONSE', 200);
      }
      return repository as unknown as GitHubRepositorySummary;
    });
  }

  async function createRepositoryTarget(
    organizationId: string,
    repositoryId: number,
  ): Promise<WorkspaceTarget> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/integrations/github/repository-targets`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId }),
      },
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('GitHub repository Target response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return requireRepositoryTarget(payload.target);
  }

  return { createRepositoryTarget, getStatus, listRepositories, startInstallation };
}

export async function completeGitHubInstallation(
  state: string,
  installationId: string,
): Promise<GitHubInstallationCompletion> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_VERSION_PREFIX}/public/integrations/github/complete`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, installationId }),
    });
  } catch {
    throw new GuardApiError('GuardAI GitHub integration is not reachable.', 'API_UNREACHABLE', 0);
  }
  const payload = await parseResponse(response);
  if (!isRecord(payload) || !isRecord(payload.integration)) {
    throw new GuardApiError('GitHub installation completion is invalid.', 'INVALID_API_RESPONSE', response.status);
  }
  return payload.integration as unknown as GitHubInstallationCompletion;
}

export type GitHubIntegrationApi = ReturnType<typeof createGitHubIntegrationApi>;
