const test = require('node:test');
const assert = require('node:assert/strict');
const securitySource = require('../../shared/scoring/security-mvp-v1.json');
const repositorySource = require('../../shared/scoring/repository-mvp-v1.json');
const { createVersionedScoringProfile } = require('../domain/scoringPolicy');
const {
  buildScoringProfileSeedSql,
  sqlLiteral,
} = require('../scripts/generateScoringProfileSeedSql');

test('generated Scoring SQL contains every canonical definition hash', () => {
  const sql = buildScoringProfileSeedSql();
  for (const source of [securitySource, repositorySource]) {
    const profile = createVersionedScoringProfile(source);
    assert.ok(sql.includes(profile.profileId));
    assert.ok(sql.includes(profile.definitionHash));
    assert.ok(sql.includes(profile.description.replace(/'/g, "''")));
  }
  assert.ok(sql.includes('scoring profile definition hash conflict'));
});

test('Scoring SQL literal escaping doubles quotes', () => {
  assert.equal(sqlLiteral("profile's text"), "'profile''s text'");
});

test('same canonical scoring sources generate byte-identical SQL', () => {
  assert.equal(buildScoringProfileSeedSql(), buildScoringProfileSeedSql());
});
