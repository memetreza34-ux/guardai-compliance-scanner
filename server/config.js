require('dotenv').config();

const {
  normalizeBillingProvider,
  parseStripePlanPriceMap,
} = require('./domain/billingConfig');

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
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripePlanPriceMap: parseStripePlanPriceMap(process.env.STRIPE_PLAN_PRICE_MAP_JSON || ''),
  maxUploadBytes: 10 * 1024 * 1024,
  maxHtmlBytes: 2 * 1024 * 1024,
  maxExtractedTextChars: 30000,
  maxRedirects: 3,
  scanTimeoutMs: 10000,
  authTimeoutMs: 5000,
});

module.exports = { config };
