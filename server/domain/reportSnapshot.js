const { HttpError } = require('../lib/httpError');
const { canonicalize, sha256Hex } = require('../lib/evidenceIntegrity');

const REPORT_SCHEMA_VERSION = 1;

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

  const snapshot = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    reportType: 'technical-screening',
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

  const canonicalJson = canonicalize(snapshot);
  return {
    snapshot,
    snapshotHash: sha256Hex(canonicalJson),
  };
}

module.exports = {
  buildTechnicalReportSnapshot,
  REPORT_SCHEMA_VERSION,
};