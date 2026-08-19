const crypto = require('node:crypto');

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

function sha256Canonical(value) {
  return crypto.createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

module.exports = {
  canonicalJson,
  sha256Canonical,
};
