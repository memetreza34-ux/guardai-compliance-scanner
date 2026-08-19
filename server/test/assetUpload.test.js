const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const {
  assertObservedAssetMetadata,
  createAssetUploadIdentity,
  detectAssetMediaType,
  hashAndSniffAssetStream,
  normalizeAssetFileName,
  normalizeAssetUploadRequest,
  normalizeMalwareVerdict,
  normalizeParserResult,
} = require('../domain/assetUpload');

const orgId = '11111111-1111-4111-8111-111111111111';

test('asset filenames are display-only and cannot influence server-generated object keys', () => {
  assert.equal(normalizeAssetFileName('../../private/report.pdf'), 'report.pdf');
  const identity = createAssetUploadIdentity(orgId);
  assert.match(identity.uploadId, /^[0-9a-f-]{36}$/i);
  assert.equal(identity.quarantineObjectKey.startsWith(`quarantine/${orgId}/`), true);
  assert.equal(identity.cleanObjectKey.startsWith(`assets/${orgId}/`), true);
  assert.equal(identity.quarantineObjectKey.endsWith(identity.uploadId), true);
  assert.equal(identity.cleanObjectKey.endsWith(identity.uploadId), true);
  assert.equal(identity.quarantineObjectKey.includes('report.pdf'), false);
  assert.equal(identity.cleanObjectKey.includes('report.pdf'), false);
});

test('asset upload request requires matching PDF/TXT extension, media type and bounded size', () => {
  assert.deepEqual(
    normalizeAssetUploadRequest({ fileName: 'policy.pdf', mediaType: 'application/pdf', byteLength: 2048 }),
    { fileName: 'policy.pdf', mediaType: 'application/pdf', byteLength: 2048 },
  );
  assert.throws(
    () => normalizeAssetUploadRequest({ fileName: 'policy.txt', mediaType: 'application/pdf', byteLength: 2048 }),
    (error) => error.code === 'ASSET_EXTENSION_MISMATCH',
  );
  assert.throws(
    () => normalizeAssetUploadRequest({ fileName: 'policy.exe', mediaType: 'application/octet-stream', byteLength: 2048 }),
    (error) => error.code === 'ASSET_MEDIA_TYPE_UNSUPPORTED',
  );
});

test('magic/content sniffing distinguishes PDF from UTF-8 text and rejects binary null bytes', () => {
  assert.equal(detectAssetMediaType(Buffer.from('%PDF-1.7\n...')), 'application/pdf');
  assert.equal(detectAssetMediaType(Buffer.from('hello utf8 äöü', 'utf8')), 'text/plain');
  assert.throws(
    () => detectAssetMediaType(Buffer.from([0x61, 0x00, 0x62])),
    (error) => error.code === 'ASSET_BINARY_CONTENT_REJECTED',
  );
});

test('stream verification hashes actual bytes and fails closed when byte budget is exceeded', async () => {
  const payload = Buffer.from('hello GuardAI asset', 'utf8');
  const result = await hashAndSniffAssetStream(Readable.from([payload]), 1024);
  assert.equal(result.byteLength, payload.length);
  assert.equal(result.detectedMediaType, 'text/plain');
  assert.match(result.sha256, /^[a-f0-9]{64}$/);

  await assert.rejects(
    () => hashAndSniffAssetStream(Readable.from([Buffer.alloc(800), Buffer.alloc(800)]), 1000),
    (error) => error.code === 'ASSET_UPLOAD_SIZE_EXCEEDED',
  );
});

test('observed storage metadata must match declared size and media type exactly', async () => {
  const declared = normalizeAssetUploadRequest({ fileName: 'a.txt', mediaType: 'text/plain', byteLength: 3 });
  const observed = await hashAndSniffAssetStream(Readable.from([Buffer.from('abc')]), 1024);
  assert.equal(assertObservedAssetMetadata({ declared, observed }).sha256, observed.sha256);
  assert.throws(
    () => assertObservedAssetMetadata({ declared, observed: { ...observed, byteLength: 4 } }),
    (error) => error.code === 'ASSET_UPLOAD_SIZE_MISMATCH',
  );
});

test('malware verdict never treats provider errors or unknown states as clean', () => {
  const attestation = { engineId: 'clamav', engineVersion: '1.4.0' };
  assert.deepEqual(
    normalizeMalwareVerdict({ verdict: 'clean', signatureVersion: '2026-08-19' }, attestation),
    { verdict: 'clean', engineId: 'clamav', engineVersion: '1.4.0', signatureVersion: '2026-08-19' },
  );
  assert.throws(
    () => normalizeMalwareVerdict({ verdict: 'error', signatureVersion: 'x' }, attestation),
    (error) => error.code === 'ASSET_MALWARE_RESULT_INVALID',
  );
});

test('parser result persists only bounded provenance/metrics and a content hash', () => {
  const attestation = { parserId: 'guardai-pdf-parser', parserVersion: '0.1.0' };
  const result = normalizeParserResult({ text: 'parsed text', pageCount: 2 }, attestation, {
    maxUploadBytes: 1024,
    uploadSessionTtlSeconds: 60,
    maxExtractedTextChars: 1000,
    maxParserSeconds: 5,
  });
  assert.equal(result.extractedTextLength, 11);
  assert.match(result.extractedTextSha256, /^[a-f0-9]{64}$/);
  assert.equal(result.pageCount, 2);

  assert.throws(
    () => normalizeParserResult({ text: 'x'.repeat(1001) }, attestation, {
      maxUploadBytes: 1024,
      uploadSessionTtlSeconds: 60,
      maxExtractedTextChars: 1000,
      maxParserSeconds: 5,
    }),
    (error) => error.code === 'ASSET_PARSER_OUTPUT_LIMIT',
  );
});
