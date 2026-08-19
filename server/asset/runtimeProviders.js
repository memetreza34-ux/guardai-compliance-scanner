let providers = Object.freeze({
  storageProvider: null,
  malwareScanner: null,
  parserProvider: null,
});
let configured = false;
let locked = false;

function normalizeProviders(nextProviders) {
  return Object.freeze({
    storageProvider: nextProviders?.storageProvider || null,
    malwareScanner: nextProviders?.malwareScanner || null,
    parserProvider: nextProviders?.parserProvider || null,
  });
}

function configureAssetRuntimeProviders(nextProviders) {
  if (locked || configured) {
    throw new Error('Asset runtime providers can only be configured once during process boot.');
  }
  providers = normalizeProviders(nextProviders);
  configured = true;
  return providers;
}

function getAssetRuntimeProviders() {
  locked = true;
  return providers;
}

function setAssetRuntimeProvidersForTest(nextProviders) {
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    throw new Error('Asset runtime provider test mutation is disabled in production.');
  }
  if (locked) {
    throw new Error('Asset runtime providers are already locked for this process.');
  }
  providers = normalizeProviders(nextProviders);
  configured = Boolean(
    providers.storageProvider || providers.malwareScanner || providers.parserProvider,
  );
  return providers;
}

module.exports = {
  configureAssetRuntimeProviders,
  getAssetRuntimeProviders,
  setAssetRuntimeProvidersForTest,
};
