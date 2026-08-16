import {
  API_BASE_URL,
  API_VERSION_PREFIX,
  GuardApiError,
} from './apiClient';
import type {
  PublicLeadCaptureConfig,
  PublicLeadReceipt,
  PublicLeadSubmission,
} from '../types/lead';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseResponse(response: Response): Promise<unknown> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new GuardApiError('GuardAI returned an invalid response.', 'INVALID_API_RESPONSE', response.status);
  }
  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : null;
    throw new GuardApiError(
      error && typeof error.message === 'string' ? error.message : 'GuardAI contact request failed.',
      error && typeof error.code === 'string' ? error.code : 'LEAD_REQUEST_FAILED',
      response.status,
      error?.details,
    );
  }
  return payload;
}

export async function getLeadCaptureConfig(): Promise<PublicLeadCaptureConfig> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_VERSION_PREFIX}/public/lead-capture`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch {
    throw new GuardApiError('GuardAI contact endpoint is not reachable.', 'API_UNREACHABLE', 0);
  }
  const payload = await parseResponse(response);
  if (!isRecord(payload) || !isRecord(payload.leadCapture)) {
    throw new GuardApiError('Lead Capture config is invalid.', 'INVALID_API_RESPONSE', response.status);
  }
  const value = payload.leadCapture;
  if (
    typeof value.enabled !== 'boolean' ||
    typeof value.marketingOptInAvailable !== 'boolean' ||
    (value.privacyNoticeVersion !== null && typeof value.privacyNoticeVersion !== 'string') ||
    (value.privacyNoticeUrl !== null && typeof value.privacyNoticeUrl !== 'string')
  ) {
    throw new GuardApiError('Lead Capture config is invalid.', 'INVALID_API_RESPONSE', response.status);
  }
  return value as unknown as PublicLeadCaptureConfig;
}

export async function submitPublicLead(
  input: PublicLeadSubmission,
  idempotencyKey: string,
): Promise<PublicLeadReceipt> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_VERSION_PREFIX}/public/leads`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw new GuardApiError('GuardAI contact endpoint is not reachable.', 'API_UNREACHABLE', 0);
  }
  const payload = await parseResponse(response);
  if (
    !isRecord(payload) ||
    typeof payload.accepted !== 'boolean' ||
    typeof payload.idempotentReplay !== 'boolean' ||
    typeof payload.marketingConfirmationRequired !== 'boolean'
  ) {
    throw new GuardApiError('Lead Capture receipt is invalid.', 'INVALID_API_RESPONSE', response.status);
  }
  return payload as unknown as PublicLeadReceipt;
}

export function createLeadIdempotencyKey(): string {
  return crypto.randomUUID();
}
