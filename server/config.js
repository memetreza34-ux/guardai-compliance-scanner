require('dotenv').config();

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
  maxUploadBytes: 10 * 1024 * 1024,
  maxHtmlBytes: 2 * 1024 * 1024,
  maxExtractedTextChars: 30000,
  maxRedirects: 3,
  scanTimeoutMs: 10000,
  authTimeoutMs: 5000,
});

module.exports = { config };
