const { z } = require('zod');
const contractMetadata = require('../../shared/scan-contract.json');

const CONTRACT_VERSION = contractMetadata.version;

const findingSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(2000),
  severity: z.enum(['critical', 'warning']),
  fixSuggestion: z.string().max(2000).optional(),
  lawReference: z.string().max(300).optional(),
});

const categorySchema = z.object({
  score: z.number().finite().min(0).max(100),
  totalChecks: z.number().int().min(0),
  passedChecks: z.number().int().min(0),
  status: z.enum(['critical', 'warning', 'compliant']),
  issues: z.array(findingSchema).max(100),
}).superRefine((category, context) => {
  if (category.passedChecks > category.totalChecks) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['passedChecks'],
      message: 'passedChecks cannot exceed totalChecks',
    });
  }
});

const scanResponseSchema = z.object({
  contractVersion: z.literal(CONTRACT_VERSION),
  url: z.string().min(1).max(4096),
  timestamp: z.string().min(1).max(100),
  type: z.enum(['web', 'asset']),
  overallScore: z.number().finite().min(0).max(100),
  categories: z.record(z.string(), categorySchema),
  notices: z.array(z.string().min(1).max(1000)).max(50).default([]),
});

function finalizeScanResponse(payload) {
  return scanResponseSchema.parse({
    contractVersion: CONTRACT_VERSION,
    notices: [],
    ...payload,
  });
}

module.exports = {
  CONTRACT_VERSION,
  categorySchema,
  finalizeScanResponse,
  findingSchema,
  scanResponseSchema,
};
