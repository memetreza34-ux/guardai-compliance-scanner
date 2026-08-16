require('dotenv').config();

const config = Object.freeze({
  port: Number(process.env.PORT || 3001),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
  maxUploadBytes: 10 * 1024 * 1024,
  maxHtmlBytes: 2 * 1024 * 1024,
  maxExtractedTextChars: 30000,
  maxRedirects: 3,
  scanTimeoutMs: 10000,
  authTimeoutMs: 5000,
});

module.exports = { config };
