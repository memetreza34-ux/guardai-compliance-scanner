const { z } = require('zod');
const contractMetadata = require('../../shared/scan-contract.json');

const CONTRACT_VERSION = contractMetadata.version;
const timestampSchema = z.preprocess(
  (value) => value instanceof Date ? value.toISOString() : value,
  z.string().datetime({ offset: true }),
);
const nullableTimestampSchema = z.preprocess(
  (value) => value instanceof Date ? value.toISOString() : value,
  z.string().datetime({ offset: true }).nullable(),
);

const scanStatusEnum = z.enum(contractMetadata.persistentScanStatusValues);
const jobStatusEnum = z.enum(contractMetadata.persistentJobStatusValues);
const moduleEnum = z.enum(contractMetadata.persistentModuleIds);
const severityEnum = z.enum(contractMetadata.persistentFindingSeverityValues);

const publicJobSchema = z.object({
  id: z.string().uuid(),
  scanId: z.string().uuid(),
  jobType: moduleEnum,
  status: jobStatusEnum,
  attemptCount: z.number().int().min(0),
  maxAttempts: z.number().int().positive(),
  availableAt: timestampSchema,
  leasedAt: nullableTimestampSchema.optional(),
  leaseExpiresAt: nullableTimestampSchema.optional(),
  resultSummary: z.record(z.string(), z.unknown()).default({}),
  completedAt: nullableTimestampSchema.optional(),
  failedAt: nullableTimestampSchema.optional(),
  errorCode: z.string().max(100).nullable().optional(),
  errorMessage: z.string().max(1000).nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema.optional(),
});

const submissionScanSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  targetId: z.string().uuid(),
  requestedBy: z.string().uuid(),
  status: scanStatusEnum,
  scannerVersion: z.string().min(1).max(100),
  contractVersion: z.literal(CONTRACT_VERSION),
  requestedModules: z.array(moduleEnum).min(1),
  idempotencyKey: z.string().max(200).nullable(),
  createdAt: timestampSchema,
});

const scanStatusSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  targetId: z.string().uuid(),
  requestedBy: z.string().uuid(),
  status: scanStatusEnum,
  scannerVersion: z.string().min(1).max(100),
  contractVersion: z.literal(CONTRACT_VERSION),
  requestedModules: z.array(moduleEnum).min(1),
  overallScore: z.number().int().min(0).max(100).nullable(),
  coverage: z.record(z.string(), z.unknown()).default({}),
  notices: z.array(z.string().max(1000)).max(100).default([]),
  startedAt: nullableTimestampSchema,
  completedAt: nullableTimestampSchema,
  failedAt: nullableTimestampSchema,
  errorCode: z.string().max(100).nullable(),
  errorMessage: z.string().max(1000).nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

const evidenceSchema = z.object({
  id: z.string().uuid(),
  detectorId: z.string().min(1).max(120),
  detectorVersion: z.string().min(1).max(80),
  type: z.string().min(1).max(120),
  source: z.string().min(1).max(2048),
  normalizedData: z.record(z.string(), z.unknown()),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  capturedAt: timestampSchema,
  createdAt: timestampSchema,
});

const findingSchema = z.object({
  findingId: z.string().uuid(),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.string().min(1).max(50),
  severity: severityEnum,
  confidence: z.coerce.number().min(0).max(1).nullable(),
  evidenceIds: z.array(z.string().uuid()),
  message: z.string().min(1).max(5000),
  remediation: z.string().max(5000).nullable(),
  firstSeenAt: timestampSchema,
  lastSeenAt: timestampSchema,
  instanceCreatedAt: timestampSchema,
});

const persistentSubmissionSchema = z.object({
  contractVersion: z.literal(CONTRACT_VERSION),
  scan: submissionScanSchema,
  jobs: z.array(publicJobSchema),
  idempotentReplay: z.boolean(),
});

const persistentStatusSchema = z.object({
  contractVersion: z.literal(CONTRACT_VERSION),
  scan: scanStatusSchema,
  jobs: z.array(publicJobSchema),
  evidence: z.array(evidenceSchema),
  findings: z.array(findingSchema),
});

function finalizePersistentSubmission(payload) {
  return persistentSubmissionSchema.parse({ contractVersion: CONTRACT_VERSION, ...payload });
}

function finalizePersistentStatus(payload) {
  return persistentStatusSchema.parse({ contractVersion: CONTRACT_VERSION, ...payload });
}

module.exports = {
  CONTRACT_VERSION,
  finalizePersistentStatus,
  finalizePersistentSubmission,
  persistentStatusSchema,
  persistentSubmissionSchema,
};
