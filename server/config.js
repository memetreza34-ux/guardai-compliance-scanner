require('dotenv').config();

const {
  normalizeBillingProvider,
  parseStripePlanPriceMap,
} = require('./domain/billingConfig');

function readBoolean(value) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}

function readInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

const config = Object.freeze({
  port: Number(process.env.PORT || 3001),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  scannerVersion: process.env.SCANNER_VERSION || '0.1.0',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  databasePoolMax: Number(process.env.DATABASE_POOL_MAX || 10),
  workerLeaseSeconds: Number(process.env.WORKER_LEASE_SECONDS || 60),
  workerPollMs: Number(process.env.WORKER_POLL_MS || 2000),
  billingProvider: normalizeBillingProvider(process.env.BILLING_PROVIDER),
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:5173',
  stripeSecretKey,
  stripeLivemode: stripeSecretKey.startsWith('sk_live_'),
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripePlanPriceMap: parseStripePlanPriceMap(process.env.STRIPE_PLAN_PRICE_MAP_JSON || ''),
  leadCaptureEnabled: readBoolean(process.env.LEAD_CAPTURE_ENABLED),
  leadPrivacyNoticeVersion: String(process.env.LEAD_PRIVACY_NOTICE_VERSION || '').trim(),
  leadRetentionDays: readInteger(process.env.LEAD_RETENTION_DAYS, 0),
  leadMarketingOptInEnabled: readBoolean(process.env.LEAD_MARKETING_OPT_IN_ENABLED),
  leadMarketingConsentVersion: String(process.env.LEAD_MARKETING_CONSENT_VERSION || '').trim(),
  leadMarketingConfirmTtlHours: readInteger(process.env.LEAD_MARKETING_CONFIRM_TTL_HOURS, 24),

  // Asset ingestion remains disabled until the selected S3 adapter and staging isolation
  // controls are present. These values are bounded again by the Asset domain layer.
  assetPipelineEnabled: readBoolean(process.env.ASSET_PIPELINE_ENABLED),
  assetMaxUploadBytes: readInteger(process.env.GUARDAI_ASSET_MAX_BYTES, 10 * 1024 * 1024),
  assetUploadSessionTtlSeconds: readInteger(process.env.GUARDAI_ASSET_UPLOAD_TTL_SECONDS, 15 * 60),
  assetMaxExtractedTextChars: readInteger(process.env.GUARDAI_ASSET_MAX_EXTRACTED_TEXT_CHARS, 100000),
  assetParserTimeoutSeconds: readInteger(process.env.GUARDAI_ASSET_PARSER_TIMEOUT_SECONDS, 30),
  assetWorkerLeaseSeconds: readInteger(process.env.GUARDAI_ASSET_WORKER_LEASE_SECONDS, 120),
  assetClamdSocket: String(process.env.GUARDAI_CLAMD_SOCKET || '').trim(),
  assetClamdTimeoutMs: readInteger(process.env.GUARDAI_CLAMD_TIMEOUT_MS, 30000),
  assetParserSocket: String(process.env.GUARDAI_ASSET_PARSER_SOCKET || '').trim(),
  assetParserTimeoutMs: readInteger(process.env.GUARDAI_ASSET_PARSER_TIMEOUT_MS, 30000),

  // Legacy prototype limits. The production Asset pipeline does not use Multer or parse
  // uploads inside the API process.
  maxUploadBytes: 10 * 1024 * 1024,
  maxHtmlBytes: 2 * 1024 * 1024,
  maxExtractedTextChars: 30000,
  maxRedirects: 3,
  scanTimeoutMs: 10000,
  authTimeoutMs: 5000,
});

module.exports = { config };
