const { z } = require('zod');
const { findingSchema } = require('../lib/scanContract');

const webScanOptionsSchema = z.object({
  aiAct: z.boolean().optional(),
  gdpr: z.boolean().optional(),
  wcag: z.boolean().optional(),
  security: z.boolean().optional(),
}).optional();

const scanSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  options: webScanOptionsSchema,
});

const webAiSchema = z.object({
  privacy: z.object({ issues: z.array(findingSchema).max(20) }).optional(),
  aiAct: z.object({ issues: z.array(findingSchema).max(20) }).optional(),
});

const fileAiSchema = z.object({
  ipRights: z.object({ issues: z.array(findingSchema).max(20) }),
  copyright: z.object({ issues: z.array(findingSchema).max(20) }),
});

function resolveWebScanOptions(options) {
  return {
    aiAct: options?.aiAct ?? true,
    gdpr: options?.gdpr ?? true,
    wcag: options?.wcag ?? false,
    security: options?.security ?? true,
  };
}

module.exports = {
  fileAiSchema,
  resolveWebScanOptions,
  scanSchema,
  webAiSchema,
};
