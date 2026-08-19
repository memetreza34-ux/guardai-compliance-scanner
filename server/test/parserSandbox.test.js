const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { createParserSandboxServer } = require('../asset/parserSandboxServer');
const { createUnixParserProvider } = require('../asset/unixParserProvider');
const { parseAssetBuffer } = require('../asset/parserSandboxEngine');

function runtimeAttestation() {
  return {
    isolatedExecution: true,
    networkDisabled: true,
    ephemeralFilesystem: true,
    resourceLimitsEnforced: true,
    outputLimitEnforced: true,
    noDirectStorageCredentials: true,
  };
}

test('parser sandbox engine validates SHA and extracts bounded UTF-8 text', async () => {
  const buffer = Buffer.from('GuardAI parser text äöü', 'utf8');
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const result = await parseAssetBuffer({
    buffer,
    mediaType: 'text/plain',
    expectedSha256: sha256,
    maxBytes: 1024,
    maxExtractedTextChars: 1000,
  });
  assert.equal(result.text, 'GuardAI parser text äöü');
  assert.equal(result.pageCount, null);

  await assert.rejects(
    () => parseAssetBuffer({
      buffer,
      mediaType: 'text/plain',
      expectedSha256: 'a'.repeat(64),
      maxBytes: 1024,
      maxExtractedTextChars: 1000,
    }),
    (error) => error.code === 'ASSET_PARSER_INPUT_HASH_MISMATCH',
  );
});

test('Unix parser provider and sandbox exchange exact bounded bytes without storage credentials', { skip: process.platform === 'win32' }, async () => {
  const socketPath = path.join(os.tmpdir(), `guardai-parser-${process.pid}-${Date.now()}.sock`);
  const sandbox = createParserSandboxServer({
    socketPath,
    parserId: 'guardai-pdf-text-parser',
    parserVersion: '0.1.0',
    maxBytes: 1024 * 1024,
    maxExtractedTextChars: 5000,
  });
  await sandbox.start();

  try {
    const provider = createUnixParserProvider({
      socketPath,
      parserId: 'guardai-pdf-text-parser',
      parserVersion: '0.1.0',
      runtimeAttestation: runtimeAttestation(),
      timeoutMs: 5000,
      maxBytes: 1024 * 1024,
      maxExtractedTextChars: 5000,
    });
    const buffer = Buffer.from('exact private document body', 'utf8');
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const result = await provider.parseStream({
      contentStream: Readable.from([buffer.subarray(0, 5), buffer.subarray(5)]),
      mediaType: 'text/plain',
      expectedSha256: sha256,
      byteLength: buffer.length,
      maxBytes: 1024 * 1024,
      maxExtractedTextChars: 5000,
      timeoutSeconds: 5,
    });

    assert.deepEqual(result, { text: 'exact private document body', pageCount: null });
    const attestation = provider.getSafetyAttestation();
    assert.equal(attestation.networkDisabled, true);
    assert.equal(attestation.noDirectStorageCredentials, true);
  } finally {
    await sandbox.stop();
  }
});

test('parser provider rejects a changed stream before accepting sandbox output', { skip: process.platform === 'win32' }, async () => {
  const socketPath = path.join(os.tmpdir(), `guardai-parser-hash-${process.pid}-${Date.now()}.sock`);
  const sandbox = createParserSandboxServer({ socketPath, maxBytes: 1024 * 1024, maxExtractedTextChars: 5000 });
  await sandbox.start();
  try {
    const provider = createUnixParserProvider({
      socketPath,
      runtimeAttestation: runtimeAttestation(),
      timeoutMs: 5000,
      maxBytes: 1024 * 1024,
      maxExtractedTextChars: 5000,
    });
    const original = Buffer.from('original', 'utf8');
    const changed = Buffer.from('changed!', 'utf8');
    const sha256 = crypto.createHash('sha256').update(original).digest('hex');
    await assert.rejects(
      () => provider.parseStream({
        contentStream: Readable.from([changed]),
        mediaType: 'text/plain',
        expectedSha256: sha256,
        byteLength: changed.length,
        maxBytes: 1024 * 1024,
        maxExtractedTextChars: 5000,
        timeoutSeconds: 5,
      }),
      (error) => error.code === 'ASSET_PARSER_INPUT_HASH_MISMATCH',
    );
  } finally {
    await sandbox.stop();
  }
});
