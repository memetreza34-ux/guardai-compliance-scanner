const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertAssetPipelineProviders,
  assertMalwareScannerAttestation,
  assertParserAttestation,
  assertStorageAttestation,
} = require('../asset/assetPipelineContract');

function safeStorage() {
  return {
    providerId: 'guardai-quarantine',
    privateByDefault: true,
    publicReadDisabled: true,
    executableServingDisabled: true,
    serverSideEncryption: true,
    boundedUploadPolicy: true,
    organizationObjectKeyIsolation: true,
    quarantineLifecycleConfigured: true,
    cleanObjectLifecycleConfigured: true,
  };
}

function safeMalware() {
  return {
    engineId: 'clamav',
    engineVersion: '1.4.0',
    isolatedExecution: true,
    failClosedOnScannerError: true,
    signatureVersionReported: true,
    noPublicArtifactAccess: true,
  };
}

function safeParser() {
  return {
    parserId: 'guardai-parser',
    parserVersion: '0.1.0',
    isolatedExecution: true,
    networkDisabled: true,
    ephemeralFilesystem: true,
    resourceLimitsEnforced: true,
    outputLimitEnforced: true,
  };
}

test('asset storage safety fails closed when public access or lifecycle controls are absent', () => {
  assert.equal(assertStorageAttestation(safeStorage()).providerId, 'guardai-quarantine');
  assert.throws(
    () => assertStorageAttestation({ ...safeStorage(), publicReadDisabled: false }),
    (error) => error.code === 'ASSET_STORAGE_NOT_SAFE' && error.details.missingControls.includes('publicReadDisabled'),
  );
  assert.throws(
    () => assertStorageAttestation({ ...safeStorage(), cleanObjectLifecycleConfigured: false }),
    (error) => error.code === 'ASSET_STORAGE_NOT_SAFE',
  );
});

test('malware and parser attestations require isolated fail-closed execution', () => {
  assert.equal(assertMalwareScannerAttestation(safeMalware()).engineId, 'clamav');
  assert.equal(assertParserAttestation(safeParser()).parserId, 'guardai-parser');
  assert.throws(
    () => assertMalwareScannerAttestation({ ...safeMalware(), failClosedOnScannerError: false }),
    (error) => error.code === 'ASSET_MALWARE_SCANNER_NOT_SAFE',
  );
  assert.throws(
    () => assertParserAttestation({ ...safeParser(), networkDisabled: false }),
    (error) => error.code === 'ASSET_PARSER_NOT_SAFE',
  );
});

test('asset pipeline refuses to activate unless all provider capabilities exist', () => {
  let storageAttestationCalls = 0;
  const providers = {
    storageProvider: {
      getSafetyAttestation() { storageAttestationCalls += 1; return safeStorage(); },
      async createQuarantineUpload() {},
      async statQuarantineObject() {},
      async openQuarantineReadStream() {},
      async promoteQuarantineObject() {},
      async deleteQuarantineObject() {},
    },
    malwareScanner: {
      getSafetyAttestation() { return safeMalware(); },
      async scanQuarantineObject() {},
    },
    parserProvider: {
      getSafetyAttestation() { return safeParser(); },
      async parseQuarantineObject() {},
    },
  };

  const result = assertAssetPipelineProviders(providers);
  assert.equal(result.storage.providerId, 'guardai-quarantine');
  assert.equal(storageAttestationCalls, 1);

  const withoutPromotion = {
    ...providers,
    storageProvider: { ...providers.storageProvider, promoteQuarantineObject: undefined },
  };
  assert.throws(
    () => assertAssetPipelineProviders(withoutPromotion),
    (error) => error.code === 'ASSET_STORAGE_NOT_CONFIGURED',
  );
  assert.throws(
    () => assertAssetPipelineProviders({ ...providers, malwareScanner: null }),
    (error) => error.code === 'ASSET_MALWARE_SCANNER_NOT_CONFIGURED',
  );
});
