let providers = Object.freeze({
  storageProvider: null,
  malwareScanner: null,
  parserProvider: null,
});

function getAssetRuntimeProviders() {
  return providers;
}

function setAssetRuntimeProvidersForProcess(nextProviders) {
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    throw new Error('Asset runtime providers must be configured by the production composition root, not mutated at runtime.');
  }
  providers = Object.freeze({
    storageProvider: nextProviders?.storageProvider || null,
    malwareScanner: nextProviders?.malwareScanner || null,
    parserProvider: nextProviders?.parserProvider || null,
  });
}

module.exports = {
  getAssetRuntimeProviders,
  setAssetRuntimeProvidersForProcess,
};
