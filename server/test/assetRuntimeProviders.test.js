const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const modulePath = path.resolve(__dirname, '../asset/runtimeProviders.js');

test('asset providers can be configured once before first read and are then locked', () => {
  const script = `
    const registry = require(${JSON.stringify(modulePath)});
    const configured = registry.configureAssetRuntimeProviders({ storageProvider: { id: 'storage' } });
    if (!configured.storageProvider) process.exit(2);
    const first = registry.getAssetRuntimeProviders();
    if (first.storageProvider.id !== 'storage') process.exit(3);
    try { registry.configureAssetRuntimeProviders({ storageProvider: { id: 'other' } }); process.exit(4); }
    catch (error) { if (!/only be configured once|locked/i.test(error.message)) process.exit(5); }
  `;
  const result = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('reading the default provider registry locks the disabled fail-closed state', () => {
  const script = `
    const registry = require(${JSON.stringify(modulePath)});
    const initial = registry.getAssetRuntimeProviders();
    if (initial.storageProvider !== null || initial.malwareScanner !== null || initial.parserProvider !== null) process.exit(2);
    try { registry.configureAssetRuntimeProviders({ storageProvider: { id: 'late' } }); process.exit(3); }
    catch (error) { if (!/locked/i.test(error.message)) process.exit(4); }
  `;
  const result = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
