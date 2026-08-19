export interface ReportTargetSnapshot {
  id: string;
  type: string;
  displayName: string;
  canonicalUrl: string | null;
  provider: string | null;
  verificationState: string;
}

export interface ReportScoringSnapshot {
  profileId: string;
  profileVersion: number;
}

export interface ReportScanSnapshot {
  id: string;
  organizationId: string;
  targetId: string;
  scannerVersion: string;
  contractVersion: string;
  requestedModules: string[];
  overallScore: number | null;
  coverage: Record<string, unknown>;
  notices: string[];
  startedAt: string | null;
  completedAt: string | null;
}

export interface ReportModuleSnapshot {
  jobType: string;
  status: string;
  resultSummary: Record<string, unknown>;
  completedAt: string | null;
}

export interface ReportEvidenceSnapshot {
  id: string;
  detectorId: string;
  detectorVersion: string;
  type: string;
  source: string;
  contentHash: string | null;
  capturedAt: string;
}

export interface ReportFindingSnapshot {
  findingId: string;
  fingerprint: string;
  ruleId: string | null;
  ruleVersion: number | null;
  /** Present on report schema v3+. Historical v2 reports did not freeze this hash. */
  ruleDefinitionHash?: string | null;
  severity: 'critical' | 'warning' | 'info';
  status: string;
  message: string;
  remediation: string | null;
  evidenceIds: string[];
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface TechnicalReportSnapshot {
  schemaVersion: number;
  reportType: 'technical-screening';
  target: ReportTargetSnapshot;
  scoring: ReportScoringSnapshot;
  scan: ReportScanSnapshot;
  modules: ReportModuleSnapshot[];
  evidence: ReportEvidenceSnapshot[];
  findings: ReportFindingSnapshot[];
  limitations: string[];
}

export interface TechnicalReportRecord {
  id: string;
  organizationId: string;
  scanId: string;
  schemaVersion: number;
  reportType: 'technical-screening';
  snapshot: TechnicalReportSnapshot;
  snapshotHash: string;
  createdBy: string;
  createdAt: string;
}

export interface TechnicalReportCreateResult {
  report: TechnicalReportRecord;
  idempotentReplay: boolean;
}

export interface TechnicalReportPage {
  reports: TechnicalReportRecord[];
  nextCursor: string | null;
}
