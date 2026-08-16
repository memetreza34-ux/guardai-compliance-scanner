import type { AccessTokenProvider } from './apiClient';
import { createAuthenticatedApiClient, GuardApiError } from './apiClient';
import type {
  FindingLifecycleStatus,
  FindingListPage,
  FindingStatusHistoryPage,
  WorkspaceFindingSummary,
} from '../types/findingLifecycle';

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

export function createFindingApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function listFindings(
    organizationId: string,
    options: {
      status?: FindingLifecycleStatus;
      targetId?: string;
      limit?: number;
      cursor?: string;
    } = {},
  ): Promise<FindingListPage> {
    const search = new URLSearchParams();
    if (options.status) search.set('status', options.status);
    if (options.targetId) search.set('targetId', options.targetId);
    if (options.limit !== undefined) search.set('limit', String(options.limit));
    if (options.cursor) search.set('cursor', options.cursor);
    const suffix = search.size > 0 ? `?${search.toString()}` : '';

    const payload = requireRecord(
      await client.request(`/organizations/${encodeURIComponent(organizationId)}/findings${suffix}`),
      'Finding list',
    );
    requireArray(payload.findings, 'Finding list');
    return payload as unknown as FindingListPage;
  }

  async function getFinding(
    organizationId: string,
    findingId: string,
  ): Promise<WorkspaceFindingSummary> {
    const payload = requireRecord(
      await client.request(
        `/organizations/${encodeURIComponent(organizationId)}/findings/${encodeURIComponent(findingId)}`,
      ),
      'Finding read',
    );
    return requireRecord(payload.finding, 'Finding') as unknown as WorkspaceFindingSummary;
  }

  async function updateFindingStatus(
    organizationId: string,
    findingId: string,
    status: FindingLifecycleStatus,
    reason?: string | null,
  ): Promise<WorkspaceFindingSummary> {
    const payload = requireRecord(
      await client.request(
        `/organizations/${encodeURIComponent(organizationId)}/findings/${encodeURIComponent(findingId)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, reason: reason ?? null }),
        },
      ),
      'Finding status update',
    );
    return requireRecord(payload.finding, 'Finding') as unknown as WorkspaceFindingSummary;
  }

  async function getFindingHistory(
    organizationId: string,
    findingId: string,
    options: { limit?: number; cursor?: string } = {},
  ): Promise<FindingStatusHistoryPage> {
    const search = new URLSearchParams();
    if (options.limit !== undefined) search.set('limit', String(options.limit));
    if (options.cursor) search.set('cursor', options.cursor);
    const suffix = search.size > 0 ? `?${search.toString()}` : '';

    const payload = requireRecord(
      await client.request(
        `/organizations/${encodeURIComponent(organizationId)}/findings/${encodeURIComponent(findingId)}/history${suffix}`,
      ),
      'Finding history',
    );
    requireArray(payload.events, 'Finding history');
    return payload as unknown as FindingStatusHistoryPage;
  }

  return {
    getFinding,
    getFindingHistory,
    listFindings,
    updateFindingStatus,
  };
}

export type FindingApi = ReturnType<typeof createFindingApi>;
