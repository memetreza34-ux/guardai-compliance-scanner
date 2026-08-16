import scanContract from '../../shared/scan-contract.json';
import type {
  PersistentModuleId,
  PersistentScanResult,
  PersistentScanSubmission,
  TargetVerificationChallenge,
  TargetVerificationCheck,
  WorkspaceOrganization,
  WorkspaceTarget,
} from '../types/workspace';
import {
  createAuthenticatedApiClient,
  GuardApiError,
  type AccessTokenProvider,
} from './apiClient';

const EXPECTED_CONTRACT_VERSION = scanContract.version;

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

function assertPersistentContract(payload: Record<string, unknown>): void {
  if (payload.contractVersion !== EXPECTED_CONTRACT_VERSION) {
    throw new GuardApiError(
      'GuardAI persistent scan contract is incompatible with this frontend.',
      'INCOMPATIBLE_SCAN_CONTRACT',
      200,
    );
  }
}

export function createWorkspaceApi(getAccessToken: AccessTokenProvider) {
  const client = createAuthenticatedApiClient(getAccessToken);

  async function listOrganizations(): Promise<WorkspaceOrganization[]> {
    const payload = requireRecord(await client.request('/organizations'), 'Organization list');
    return requireArray(payload.organizations, 'Organization list') as WorkspaceOrganization[];
  }

  async function createOrganization(name: string): Promise<WorkspaceOrganization> {
    const payload = requireRecord(await client.request('/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }), 'Organization create');
    return requireRecord(payload.organization, 'Organization') as unknown as WorkspaceOrganization;
  }

  async function listTargets(organizationId: string): Promise<WorkspaceTarget[]> {
    const payload = requireRecord(
      await client.request(`/organizations/${encodeURIComponent(organizationId)}/targets`),
      'Target list',
    );
    return requireArray(payload.targets, 'Target list') as WorkspaceTarget[];
  }

  async function getTarget(organizationId: string, targetId: string): Promise<WorkspaceTarget> {
    const payload = requireRecord(
      await client.request(
        `/organizations/${encodeURIComponent(organizationId)}/targets/${encodeURIComponent(targetId)}`,
      ),
      'Target read',
    );
    return requireRecord(payload.target, 'Target') as unknown as WorkspaceTarget;
  }

  async function createWebsiteTarget(
    organizationId: string,
    input: { url: string; displayName?: string },
  ): Promise<WorkspaceTarget> {
    const payload = requireRecord(
      await client.request(`/organizations/${encodeURIComponent(organizationId)}/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'website', ...input }),
      }),
      'Target create',
    );
    return requireRecord(payload.target, 'Target') as unknown as WorkspaceTarget;
  }

  async function startTargetVerification(
    organizationId: string,
    targetId: string,
  ): Promise<TargetVerificationChallenge> {
    const payload = requireRecord(
      await client.request(
        `/organizations/${encodeURIComponent(organizationId)}/targets/${encodeURIComponent(targetId)}/verification-challenges`,
        { method: 'POST' },
      ),
      'Target verification challenge',
    );
    return requireRecord(payload.challenge, 'Target verification challenge') as unknown as TargetVerificationChallenge;
  }

  async function checkTargetVerification(
    organizationId: string,
    targetId: string,
  ): Promise<TargetVerificationCheck> {
    const payload = requireRecord(
      await client.request(
        `/organizations/${encodeURIComponent(organizationId)}/targets/${encodeURIComponent(targetId)}/verification-challenges/check`,
        { method: 'POST' },
      ),
      'Target verification check',
    );
    return requireRecord(payload.verification, 'Target verification') as unknown as TargetVerificationCheck;
  }

  async function submitScan(
    organizationId: string,
    targetId: string,
    modules: PersistentModuleId[],
    idempotencyKey: string,
  ): Promise<PersistentScanSubmission> {
    const payload = requireRecord(
      await client.request(
        `/organizations/${encodeURIComponent(organizationId)}/targets/${encodeURIComponent(targetId)}/scans`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({ modules }),
        },
      ),
      'Scan submission',
    );
    assertPersistentContract(payload);
    return payload as unknown as PersistentScanSubmission;
  }

  async function getScanStatus(
    organizationId: string,
    scanId: string,
  ): Promise<PersistentScanResult> {
    const payload = requireRecord(
      await client.request(
        `/organizations/${encodeURIComponent(organizationId)}/scans/${encodeURIComponent(scanId)}`,
      ),
      'Scan status',
    );
    assertPersistentContract(payload);
    return payload as unknown as PersistentScanResult;
  }

  return {
    checkTargetVerification,
    createOrganization,
    createWebsiteTarget,
    getScanStatus,
    getTarget,
    listOrganizations,
    listTargets,
    startTargetVerification,
    submitScan,
  };
}

export function createScanIdempotencyKey(): string {
  return crypto.randomUUID();
}
