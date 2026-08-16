const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createDnsVerificationChallenge,
  extractVerifiableHostname,
  isValidPublicDnsHostname,
  txtRecordsMatchTokenHash,
} = require('../domain/targetVerification');
const { sha256Hex } = require('../lib/evidenceIntegrity');


test('extracts normalized public hostname from website target URL', () => {
  assert.equal(extractVerifiableHostname('https://Example.COM/path'), 'example.com');
  assert.throws(() => extractVerifiableHostname('https://127.0.0.1/'), /public DNS hostname/i);
  assert.throws(() => extractVerifiableHostname('http://[::1]/'), /public DNS hostname/i);
  assert.throws(() => extractVerifiableHostname('https://localhost/'), /public DNS hostname/i);
  assert.throws(() => extractVerifiableHostname('ftp://example.com/'), /HTTP or HTTPS/i);
});


test('public DNS hostname labels are strict', () => {
  assert.equal(isValidPublicDnsHostname('example.com'), true);
  assert.equal(isValidPublicDnsHostname('sub-domain.example.com'), true);
  assert.equal(isValidPublicDnsHostname('singlelabel'), false);
  assert.equal(isValidPublicDnsHostname('-bad.example.com'), false);
  assert.equal(isValidPublicDnsHostname('bad_.example.com'), false);
});


test('creates a token whose raw value is returned once and hash is persistable', () => {
  const challenge = createDnsVerificationChallenge('https://example.com/');
  assert.equal(challenge.dnsRecordName, '_guardai-challenge.example.com');
  assert.equal(challenge.tokenHash, sha256Hex(challenge.token));
  assert.equal(challenge.dnsRecordValue, `guardai-verification=${challenge.token}`);
  assert.match(challenge.tokenHash, /^[a-f0-9]{64}$/);
});


test('TXT records are matched by token hash and support segmented DNS TXT values', () => {
  const token = 'secret-token';
  const tokenHash = sha256Hex(token);

  assert.equal(
    txtRecordsMatchTokenHash([['guardai-verification=', token]], tokenHash),
    true,
  );
  assert.equal(
    txtRecordsMatchTokenHash([['guardai-verification=wrong']], tokenHash),
    false,
  );
});
