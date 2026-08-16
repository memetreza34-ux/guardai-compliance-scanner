const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeWebsiteTargetInput } = require('../domain/websiteTarget');


test('website target adds https and strips query/fragment for stable identity', () => {
  const target = normalizeWebsiteTargetInput({
    url: 'Example.COM/path?campaign=123#section',
    displayName: '',
  });

  assert.equal(target.canonicalUrl, 'https://example.com/path');
  assert.equal(target.displayName, 'example.com');
  assert.equal(target.hostname, 'example.com');
});


test('website target rejects local and IP hosts', () => {
  assert.throws(
    () => normalizeWebsiteTargetInput({ url: 'http://localhost', displayName: 'Local' }),
    /public DNS hostname/i,
  );
  assert.throws(
    () => normalizeWebsiteTargetInput({ url: 'https://127.0.0.1', displayName: 'IP' }),
    /public DNS hostname/i,
  );
  assert.throws(
    () => normalizeWebsiteTargetInput({ url: 'http://[::1]', displayName: 'IPv6' }),
    /public DNS hostname/i,
  );
});


test('website target rejects credentials and nonstandard ports', () => {
  assert.throws(
    () => normalizeWebsiteTargetInput({ url: 'https://user:pass@example.com', displayName: 'Bad' }),
    /credentials/i,
  );
  assert.throws(
    () => normalizeWebsiteTargetInput({ url: 'https://example.com:8443', displayName: 'Bad' }),
    /standard HTTP\/HTTPS ports/i,
  );
});
