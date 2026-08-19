import {
  createAuthenticatedApiClient,
  GuardApiError,
  type AccessTokenProvider,
} from './apiClient';
import type {
  AiGovernanceReview,
  AiSystemDeclarationInput,
  AiSystemProfile,
} from '../types/aiGovernance';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireSystem(value: unknown): AiSystemProfile {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.systemName !== 'string') {
    throw new GuardApiError('AI System response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  return value as unknown as AiSystemProfile;
}

function requireReview(value: unknown): AiGovernanceReview {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.status !== 'string' ||
    value.legalApplicabilityState !== 'requires_human_review'
  ) {
    throw new GuardApiError('AI Governance Review response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  return value as unknown as AiGovernanceReview;
}

export function createAiGovernanceApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function listSystems(
    organizationId: string,
    options: { includeArchived?: boolean } = {},
  ): Promise<AiSystemProfile[]> {
    const query = new URLSearchParams();
    if (options.includeArchived !== undefined) query.set('includeArchived', String(options.includeArchived));
    const suffix = query.size > 0 ? `?${query.toString()}` : '';
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/ai-systems${suffix}`,
    );
    if (!isRecord(payload) || !Array.isArray(payload.systems)) {
      throw new GuardApiError('AI System list response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return payload.systems.map(requireSystem);
  }

  async function createSystem(
    organizationId: string,
    declaration: AiSystemDeclarationInput,
  ): Promise<AiSystemProfile> {
    const payload = await client.request(`/organizations/${encodeURIComponent(organizationId)}/ai-systems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(declaration),
    });
    if (!isRecord(payload)) {
      throw new GuardApiError('AI System create response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return requireSystem(payload.system);
  }

  async function updateSystem(
    organizationId: string,
    systemId: string,
    declaration: AiSystemDeclarationInput,
  ): Promise<AiSystemProfile> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/ai-systems/${encodeURIComponent(systemId)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(declaration),
      },
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('AI System update response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return requireSystem(payload.system);
  }

  async function archiveSystem(organizationId: string, systemId: string): Promise<AiSystemProfile> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/ai-systems/${encodeURIComponent(systemId)}/archive`,
      { method: 'POST' },
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('AI System archive response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return requireSystem(payload.system);
  }

  async function createReview(organizationId: string, systemId: string): Promise<AiGovernanceReview> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/ai-systems/${encodeURIComponent(systemId)}/reviews`,
      { method: 'POST' },
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('AI Governance Review create response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return requireReview(payload.review);
  }

  async function listReviews(
    organizationId: string,
    systemId?: string,
  ): Promise<AiGovernanceReview[]> {
    const query = new URLSearchParams();
    if (systemId) query.set('systemId', systemId);
    const suffix = query.size > 0 ? `?${query.toString()}` : '';
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/ai-governance/reviews${suffix}`,
    );
    if (!isRecord(payload) || !Array.isArray(payload.reviews)) {
      throw new GuardApiError('AI Governance Review list response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return payload.reviews.map(requireReview);
  }

  async function getReview(organizationId: string, reviewId: string): Promise<AiGovernanceReview> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/ai-governance/reviews/${encodeURIComponent(reviewId)}`,
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('AI Governance Review response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return requireReview(payload.review);
  }

  async function transitionReview(
    organizationId: string,
    reviewId: string,
    action: 'submit' | 'review' | 'reopen',
  ): Promise<AiGovernanceReview> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/ai-governance/reviews/${encodeURIComponent(reviewId)}/${action}`,
      { method: 'POST' },
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('AI Governance Review update response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return requireReview(payload.review);
  }

  return {
    archiveSystem,
    createReview,
    createSystem,
    getReview,
    listReviews,
    listSystems,
    transitionReview,
    updateSystem,
  };
}

export type AiGovernanceApi = ReturnType<typeof createAiGovernanceApi>;
