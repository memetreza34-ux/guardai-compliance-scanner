const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createOrganizationSlug,
  normalizeOrganizationName,
  slugBaseFromName,
} = require('../domain/organization');


test('organization names are trimmed and whitespace-normalized', () => {
  assert.equal(normalizeOrganizationName('  GuardAI   GmbH  '), 'GuardAI GmbH');
  assert.throws(() => normalizeOrganizationName('   '), /1 to 160/i);
  assert.throws(() => normalizeOrganizationName('x'.repeat(161)), /1 to 160/i);
});


test('organization slug base is URL-safe', () => {
  assert.equal(slugBaseFromName('München & Partner GmbH'), 'munchen-partner-gmbh');
});


test('generated organization slugs include a non-predictable collision suffix', () => {
  const fakeRandom = () => Buffer.from('01020304', 'hex');
  assert.equal(createOrganizationSlug('GuardAI GmbH', fakeRandom), 'guardai-gmbh-01020304');
  assert.equal(createOrganizationSlug('A', fakeRandom), 'org-01020304');
});