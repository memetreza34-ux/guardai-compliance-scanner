const { GoogleGenAI } = require('@google/genai');
const { config } = require('./config');
const { createScanAccessPolicy } = require('./lib/scanAccess');

const scanAccess = createScanAccessPolicy();
const ai = config.geminiApiKey
  ? new GoogleGenAI({ apiKey: config.geminiApiKey })
  : null;

module.exports = {
  ai,
  scanAccess,
};
