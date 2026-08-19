const LEGAL_SOURCE_IDS = Object.freeze({
  'eu-ai-act-2024-1689-art-4': 'a1000000-0000-4000-8000-000000000004',
  'eu-ai-act-2024-1689-art-14': 'a1000000-0000-4000-8000-000000000014',
  'eu-ai-act-2024-1689-art-50': 'a1000000-0000-4000-8000-000000000050',
});

function legalSourceIdForKey(key) {
  const id = LEGAL_SOURCE_IDS[key];
  if (!id) {
    throw new Error(`Unknown GuardAI AI Governance legal-source key: ${key}`);
  }
  return id;
}

module.exports = {
  LEGAL_SOURCE_IDS,
  legalSourceIdForKey,
};
