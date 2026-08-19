const { HttpError } = require('../lib/httpError');
const { canonicalize, sha256Hex } = require('../lib/evidenceIntegrity');

const REPORT_SCHEMA_VERSION = 3;
const REPORT_TYPE = 'technical-screening';
const SUPPORTED_REPORT_SCHEMA_VERSIONS = Object.freeze([2, 3]);

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function calculateReportSnapshotHash(snapshot) {
  return sha256Hex(canonicalize(snapshot));
}

function assertReportSnapshotIntegrity(report) {
  if (!report || !isPlainObject(report) || !isPlainObject(report.snapshot)) {
    throw new HttpError(500, 'Stored report snapshot is invalid.', 'REPORT_INTEGRITY_FAILED');
  }
  if (
    !Number.isInteger(report.schemaVersion)
    || report.schemaVersion !== report.snapshot.schemaVersion
    || !SUPPORTED_REPORT_SCHEMA_VERSIONS.includes(report.schemaVersion)
  ) {
    throw new HttpError(500, 'Stored report schema provenance is invalid.', 'REPORT_INTEGRITY_FAILED');
  }
  if (report.reportType !== report.snapshot.reportType) {
    throw new HttpError(500, 'Stored report type provenance is invalid.', 'REPORT_INTEGRITY_FAILED');
  }
  if (typeof report.snapshotHash !== 'string' || !/^[a-f0-9]{64}$/.test(report.snapshotHash)) {
    throw new HttpError(500, 'Stored report hash is invalid.', 'REPORT_INTEGRITY_FAILED');
  }

  const calculatedHash = calculateReportSnapshotHash(report.snapshot);
  if (calculatedHash !== report.snapshotHash) {
    throw new HttpError(500, 'Stored report snapshot failed integrity verification.', 'REPORT_INTEGRITY_FAILED');
  }

  if (report.schemaVersion >= 3) {
    for (const finding of report.snapshot.findings || []) {
      const hasRule = finding.ruleId !== null && finding.ruleId !== undefined;
      const hasVersion = finding.ruleVersion !== null && finding.ruleVersion !== undefined;
      const hasHash = typeof finding.ruleDefinitionHash === 'string' && /^[a-f0-9]{64}$/.test(finding.ruleDefinitionHash);
      if (hasRule !== hasVersion || hasRule !== hasHash) {
        throw new HttpError(500, 'Stored report Rule provenance is incomplete.', 'REPORT_INTEGRITY_FAILED');
      }
    }
  }

  return report;
}

function buildTechnicalReportSnapshot(scanResult) {
  if (!scanResult || typeof scanResult !== 'object') {
    throw new TypeError('Report snapshot requires a persistent Scan result.');
  }
  const { scan, jobs, evidence, findings } = scanResult;
  if (!scan || scan.status !== 'completed') {
    throw new HttpError(
      409,
      'A technical report snapshot can only be created for a completed Scan.',
      'SCAN_NOT_REPORTABLE',
    );
  }
  if (!isPlainObject(scan.targetSnapshot)) {
    throw new HttpError(
      500,
      'Completed Scan is missing immutable Target provenance.',
      'SCAN_PROVENANCE_INCOMPLETE',
    );
  }
  if (
    typeof scan.scoringProfileId !== 'string' ||
    !Number.isInteger(scan.scoringProfileVersion) ||
    scan.scoringProfileVersion < 1
  ) {
    throw new HttpError(
      500,
      'Completed Scan is missing immutable scoring provenance.',
      'SCAN_PROVENANCE_INCOMPLETE',
    );
  }

  for (const finding of findings || []) {
    const hasRule = finding.ruleId !== null && finding.ruleId !== undefined;
    const hasVersion = finding.ruleVersion !== null && finding.ruleVersion !== undefined;
    const hasHash = typeof finding.ruleDefinitionHash === 'string' && /^[a-f0-9]{64}$/.test(finding.ruleDefinitionHash);
    if (hasRule !== hasVersion || hasRule !== hasHash) {
      throw new HttpError(
        500,
        'Completed Scan is missing immutable Rule definition provenance.',
        'SCAN_PROVENANCE_INCOMPLETE',
      );
    }
  }

  const snapshot = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    reportType: REPORT_TYPE,
    target: { ...scan.targetSnapshot },
    scoring: {
      profileId: scan.scoringProfileId,
      profileVersion: scan.scoringProfileVersion,
    },
    scan: {
      id: scan.id,
      organizationId: scan.organizationId,
      targetId: scan.targetId,
      scannerVersion: scan.scannerVersion,
      contractVersion: scan.contractVersion,
      requestedModules: [...scan.requestedModules],
      overallScore: scan.overallScore,
      coverage: scan.coverage || {},
      notices: scan.notices || [],
      startedAt: scan.startedAt,
      completedAt: scan.completedAt,
    },
    modules: (jobs || []).map((job) => ({
      jobType: job.jobType,
      status: job.status,
      resultSummary: job.resultSummary || {},
      completedAt: job.completedAt || null,
    })),
    evidence: (evidence || []).map((item) => ({
      id: item.id,
      detectorId: item.detectorId,
      detectorVersion: item.detectorVersion,
      type: item.type,
      source: item.source,
      contentHash: item.contentHash,
      capturedAt: item.capturedAt,
    })),
    findings: (findings || []).map((finding) => ({
      findingId: finding.findingId,
      fingerprint: finding.fingerprint,
      ruleId: finding.ruleId,
      ruleVersion: finding.ruleVersion,
      ruleDefinitionHash: finding.ruleDefinitionHash,
      severity: finding.severity,
      status: finding.status,
      message: finding.message,
      remediation: finding.remediation,
      evidenceIds: [...finding.evidenceIds],
      firstSeenAt: finding.firstSeenAt,
      lastSeenAt: finding.lastSeenAt,
    })),
    limitations: [
      'Automated technical screening may produce false positives and false negatives.',
      'This report is not a legal opinion, certification, penetration test or proof of compliance.',
      'Absence of a finding is not proof that a risk or legal issue does not exist.',
    ],
  };

  return {
    snapshot,
    snapshotHash: calculateReportSnapshotHash(snapshot),
  };
}

module.exports = {
  assertReportSnapshotIntegrity,
  buildTechnicalReportSnapshot,
  calculateReportSnapshotHash,
  REPORT_SCHEMA_VERSION,
  REPORT_TYPE,
  SUPPORTED_REPORT_SCHEMA_VERSIONS,
};
