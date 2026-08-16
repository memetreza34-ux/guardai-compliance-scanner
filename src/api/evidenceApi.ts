import { createAuthenticatedApiClient, GuardApiError, type AccessTokenProvider } from './apiClient';
import type { EvidenceExplorerItem, EvidenceExplorerPage } from '../types/evidenceExplorer';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new GuardApiError(`${label} response is invalid.`, 'INVALID_API_RESPONSE', 200);
  }
  return value;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new GuardApiError(`${label} response is invalid.`, 'INVALID_API_RESPONSE', 200);
  }
  return value;
}

export function createEvidenceApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function listEvidence(
    organizationId: string,
    options: {
      targetId?: string;
      scanId?: string;
      detectorId?: string;
      type?: string;
      limit?: number;
      cursor?: string;
    } = {},
  ): Promise<EvidenceExplorerPage> {
    const search = new URLSearchParams();
    if (options.targetId) search.set('targetId', options.targetId);
    if (options.scanId) search.set('scanId', options.scanId);
    if (options.detectorId) search.set('detectorId', options.detectorId);
    if (options.type) search.set('type', options.type);
    if (options.limit !== undefined) search.set('limit', String(options.limit));
    if (options.cursor) search.set('cursor', options.cursor);
    const suffix = search.size > 0 ? `?${search.toString()}` : '';

    const payload = requireRecord(
      await client.request(`/organizations/${encodeURIComponent(organizationId)}/evidence${suffix}`),
      'Evidence list',
    );
    requireArray(payload.evidence, 'Evidence list');
    return payload as unknown as EvidenceExplorerPage;
  }

  async function getEvidence(
    organizationId: string,
    evidenceId: string,
  ): Promise<EvidenceExplorerItem> {
    const payload = requireRecord(
      await client.request(
        `/organizations/${encodeURIComponent(organizationId)}/evidence/${encodeURIComponent(evidenceId)}`,
      ),
      'Evidence read',
    );
    return requireRecord(payload.evidence, 'Evidence') as unknown as EvidenceExplorerItem;
  }

  return { getEvidence, listEvidence };
}

export type EvidenceApi = ReturnType<typeof createEvidenceApi>;
