import {
  createAuthenticatedApiClient,
  GuardApiError,
  type AccessTokenProvider,
} from './apiClient';
import type { BillingCheckout, BillingStatus } from '../types/billing';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertBillingStatus(value: unknown): BillingStatus {
  if (!isRecord(value) || !Array.isArray(value.availablePlans)) {
    throw new GuardApiError('Billing status response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  if (
    typeof value.provider !== 'string' ||
    typeof value.plan !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.cancelAtPeriodEnd !== 'boolean' ||
    typeof value.billingEnabled !== 'boolean' ||
    !value.availablePlans.every((plan) => typeof plan === 'string')
  ) {
    throw new GuardApiError('Billing status response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  if (value.periodEnd !== null && typeof value.periodEnd !== 'string') {
    throw new GuardApiError('Billing period response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  return value as unknown as BillingStatus;
}

function assertCheckout(value: unknown): BillingCheckout {
  if (!isRecord(value) || typeof value.sessionId !== 'string' || typeof value.url !== 'string') {
    throw new GuardApiError('Billing checkout response is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  let parsed;
  try {
    parsed = new URL(value.url);
  } catch {
    throw new GuardApiError('Billing checkout URL is invalid.', 'INVALID_API_RESPONSE', 200);
  }
  if (parsed.protocol !== 'https:') {
    throw new GuardApiError('Billing checkout URL is not HTTPS.', 'INVALID_API_RESPONSE', 200);
  }
  return value as unknown as BillingCheckout;
}

export function createBillingApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function getStatus(organizationId: string): Promise<BillingStatus> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/billing`,
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('Billing status response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return assertBillingStatus(payload.billing);
  }

  async function createCheckout(
    organizationId: string,
    plan: string,
  ): Promise<BillingCheckout> {
    const payload = await client.request(
      `/organizations/${encodeURIComponent(organizationId)}/billing/checkout-session`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      },
    );
    if (!isRecord(payload)) {
      throw new GuardApiError('Billing checkout response is invalid.', 'INVALID_API_RESPONSE', 200);
    }
    return assertCheckout(payload.checkout);
  }

  return { createCheckout, getStatus };
}

export type BillingApi = ReturnType<typeof createBillingApi>;
