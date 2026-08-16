const DEFAULT_API_BASE_URL = 'http://localhost:3001';
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
export const API_VERSION_PREFIX = '/api/v1';

export class GuardApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'GuardApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type AccessTokenProvider = () => Promise<string | null>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseApiError(response: Response): Promise<GuardApiError> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && isRecord(body.error)) {
      const code = typeof body.error.code === 'string' ? body.error.code : 'API_REQUEST_FAILED';
      const message = typeof body.error.message === 'string'
        ? body.error.message
        : `GuardAI API returned HTTP ${response.status}.`;
      return new GuardApiError(message, code, response.status, body.error.details);
    }
  } catch {
    // Fall through to a user-safe generic error.
  }

  return new GuardApiError(
    `GuardAI API returned HTTP ${response.status}.`,
    'API_REQUEST_FAILED',
    response.status,
  );
}

export function createAuthenticatedApiClient(getAccessToken: AccessTokenProvider) {
  async function request(path: string, init: RequestInit = {}): Promise<unknown> {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new GuardApiError('Authentication is required.', 'UNAUTHORIZED', 401);
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${API_VERSION_PREFIX}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...init.headers,
        },
      });
    } catch (error) {
      console.error('GuardAI API request failed:', error);
      throw new GuardApiError(
        'GuardAI backend is not reachable.',
        'API_UNREACHABLE',
        0,
      );
    }

    if (!response.ok) throw await parseApiError(response);

    try {
      return await response.json();
    } catch {
      throw new GuardApiError(
        'GuardAI API returned invalid JSON.',
        'INVALID_API_RESPONSE',
        response.status,
      );
    }
  }

  return { request };
}
