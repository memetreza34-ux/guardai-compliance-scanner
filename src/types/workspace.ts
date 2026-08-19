export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer';
export type TargetType = 'website' | 'repository' | 'asset';
export type TargetVerificationState = 'unverified' | 'pending' | 'verified' | 'failed';
export type PersistentScanStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type PersistentJobStatus = PersistentScanStatus;
export type PersistentModuleId =
  | 'security'
  | 'privacy'
  | 'accessibility'
  | 'ai-governance'
  | 'repository'
  | 'asset';
export type PersistentFindingSeverity = 'critical' | 'warning' | 'info';
export type PersistentCoverageState =
  | 'queued'
  | 'running'
  | 'retrying'
  | 'assessed'
  | 'observed'
  | 'error'
  | 'cancelled'
  | 'not_assessed';

export interface PersistentCoverageEntry {
  state: PersistentCoverageState;
  score?: number | null;
  detectorId?: string;
  detectorVersion?: string;
  evidenceId?: string;
  attemptCount?: number;
  maxAttempts?: number;
  [key: string]: unknown;
}

export interface WorkspaceOrganization {
  id: string;
  name: string;
  slug: string;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceTarget {
  id: string;
  organizationId: string;
  type: TargetType;
  displayName: string;
  canonicalUrl: string | null;
  provider: string | null;
  verificationState: TargetVerificationState;
  verificationMetadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TargetVerificationChallenge {
  challengeId: string;
  method: 'dns_txt';
  status: 'pending';
  dnsRecordName: string;
  dnsRecordType: 'TXT';
  dnsRecordValue: string;
  expiresAt: string;
}

export interface TargetVerificationCheck {
  challengeId?: string;
  status: 'pending' | 'verified' | 'expired' | 'failed';
  verified: boolean;
  alreadyVerified?: boolean;
  attemptCount?: number;
  expiresAt?: string;
  lastCheckedAt?: string;
}

export interface PersistentJob {
  id: string;
  scanId: string;
  jobType: PersistentModuleId;
  status: PersistentJobStatus;
  attemptCount: number;
  maxAttempts: number;
  availableAt: string;
  leasedAt?: string | null;
  leaseExpiresAt?: string | null;
  resultSummary: Record<string, unknown>;
  completedAt?: string | null;
  failedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PersistentScan {
  id: string;
  organizationId: string;
  targetId: string;
  requestedBy: string;
  status: PersistentScanStatus;
  scannerVersion: string;
  contractVersion: string;
  requestedModules: PersistentModuleId[];
  overallScore?: number | null;
  coverage?: Partial<Record<PersistentModuleId, PersistentCoverageEntry>>;
  notices?: string[];
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PersistentEvidence {
  id: string;
  detectorId: string;
  detectorVersion: string;
  type: string;
  source: string;
  normalizedData: Record<string, unknown>;
  contentHash: string | null;
  capturedAt: string;
  createdAt: string;
}

export interface PersistentFinding {
  findingId: string;
  fingerprint: string;
  status: string;
  severity: PersistentFindingSeverity;
  confidence: number | null;
  evidenceIds: string[];
  message: string;
  remediation: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  instanceCreatedAt: string;
}

export interface PersistentScanSubmission {
  contractVersion: string;
  scan: PersistentScan;
  jobs: PersistentJob[];
  idempotentReplay: boolean;
}

export interface PersistentScanResult {
  contractVersion: string;
  scan: PersistentScan;
  jobs: PersistentJob[];
  evidence: PersistentEvidence[];
  findings: PersistentFinding[];
}

export interface WorkspaceAuditEvent {
  id: string;
  organizationId: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface WorkspaceAuditPage {
  events: WorkspaceAuditEvent[];
  nextCursor: string | null;
}
