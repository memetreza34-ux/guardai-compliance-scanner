require('dotenv').config();
const { createParserSandboxServer } = require('../asset/parserSandboxServer');

function positiveIntegerEnv(name, fallback, { min, max }) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

async function main() {
  const socketPath = process.env.GUARDAI_ASSET_PARSER_SOCKET;
  if (!socketPath) throw new Error('GUARDAI_ASSET_PARSER_SOCKET is required.');

  const sandbox = createParserSandboxServer({
    socketPath,
    parserId: 'guardai-pdf-text-parser',
    parserVersion: '0.1.0',
    maxBytes: positiveIntegerEnv('GUARDAI_ASSET_MAX_BYTES', 10 * 1024 * 1024, {
      min: 1024,
      max: 50 * 1024 * 1024,
    }),
    maxExtractedTextChars: positiveIntegerEnv('GUARDAI_ASSET_MAX_EXTRACTED_TEXT_CHARS', 100000, {
      min: 1000,
      max: 1000000,
    }),
  });

  await sandbox.start();
  console.log('[Parser Sandbox] listening on configured Unix socket.');

  let stopping = false;
  async function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    console.log(`[Parser Sandbox] ${signal} received; closing.`);
    await sandbox.stop();
    process.exit(0);
  }

  process.once('SIGTERM', () => { shutdown('SIGTERM').catch((error) => { console.error(error); process.exit(1); }); });
  process.once('SIGINT', () => { shutdown('SIGINT').catch((error) => { console.error(error); process.exit(1); }); });
}

main().catch((error) => {
  console.error('[Parser Sandbox] startup failed:', error);
  process.exit(1);
});
