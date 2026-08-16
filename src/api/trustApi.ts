import {
  API_BASE_URL,
  API_VERSION_PREFIX,
  createAuthenticatedApiClient,
  GuardApiError,
  type AccessTokenProvider,
} from './apiClient';
import type {
  PublicTrustProjection,
  TrustPublicationPage,
  TrustPublicationRecord,
  TrustPublishResult,
} from '../types/trust';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertPublication(value: unknown): TrustPublicationRecord {
  if (!isRecord(value)) {
    throw new GuardApiError('Trust publication response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  if (
    typeof value.id !== 'string' ||
    typeof value.organizationId !== 'string' ||
    typeof value.reportSnapshotId !== 'string' ||
    typeof value.publicSlug !== 'string' ||
    !['published', 'revoked'].includes(String(value.status))
  ) {
    throw new GuardApiError('Trust publication response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  return value as unknown as TrustPublicationRecord;
}

async function parsePublicError(response: Response): Promise<GuardApiError> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && isRecord(body.error)) {
      return new GuardApiError(
        typeof body.error.message === 'string' ? body.error.message : 'Public Trust request failed.',
        typeof body.error.code === 'string' ? body.error.code : 'PUBLIC_TRUST_REQUEST_FAILED',
        response.status,
        body.error.details,
      );
    }
  } catch {
    // Fall through to a bounded generic error.
  }
  return new GuardApiError('Public Trust request failed.', 'PUBLIC_TRUST_REQUEST_FAILED', response.status);
}

export function createTrustApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function publish(
    organizationId: string,
    reportId: string,
  ): Promise<TrustPublishResult> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/trust-publications`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      },
    );
    if (!isRecord(payload) || typeof payload.created !== 'boolean' || typeof payload.publicPath !== 'string' || typeof payload.badgePath !== 'string') {
      throw new GuardApiError('Trust publication create response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return {
      created: payload.created,
      publication: assertPublication(payload.publication),
      slugCollision: payload.slugCollision === true,
      publicPath: payload.publicPath,
      badgePath: payload.badgePath,
    };
  }

  async function list(
    organizationId: string,
    options: { limit?: number; cursor?: string } = {},
  ): Promise<TrustPublicationPage> {
    const query = new URLSearchParams();
    if (options.limit !== undefined) query.set('limit', String(options.limit));
    if (options.cursor) query.set('cursor', options.cursor);
    const suffix = query.size > 0 ? `?${query.toString()}` : '';
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/trust-publications${suffix}`,
    );
    if (!isRecord(payload) || !Array.isArray(payload.publications)) {
      throw new GuardApiError('Trust publication list response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return {
      publications: payload.publications.map(assertPublication),
      nextCursor: typeof payload.nextCursor === 'string' ? payload.nextCursor : null,
    };
  }

  async function revoke(
    organizationId: string,
    publicationId: string,
  ): Promise<TrustPublicationRecord> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/trust-publications/${encodeURIComponent(publicationId)}/revoke`,
      { method: 'POST' },
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('Trust publication revoke response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return assertPublication(payload.publication);
  }

  return { list, publish, revoke };
}

export async function fetchPublicTrust(publicSlug: string): Promise<PublicTrustProjection> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}${API_VERSION_PREFIX}/public/trust/${encodeURIComponent(publicSlug)}`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' },
    );
  } catch {
    throw new GuardApiError('GuardAI public Trust endpoint is not reachable.', 'API_UNREACHABLE', 0);
  }
  if (!response.ok) throw await parsePublicError(response);

  const payload: unknown = await response.json();
  if (!isRecord(payload) || payload.schemaVersion !== 1 || !isRecord(payload.report) || typeof payload.report.snapshotHash !== 'string') {
    throw new GuardApiError('Public Trust response is invalid.', 'INVALID_API_RESPONSE', response.status);
  }
  return payload as unknown as PublicTrustProjection;
}

export type TrustApi = ReturnType<typeof createTrustApi>;
