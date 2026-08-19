const test = require('node:test');
const assert = require('node:assert/strict');
const securitySource = require('../../shared/rules/security-baseline.json');
const repositorySource = require('../../shared/rules/repository-baseline.json');
const { createVersionedRuleRegistry } = require('../rules/versionedRuleRegistry');
const {
  buildRuleSeedSql,
  sqlLiteral,
} = require('../scripts/generateRuleSeedSql');

test('generated Rule SQL contains every canonical definition hash and manifest evidence', () => {
  const sql = buildRuleSeedSql();
  for (const source of [securitySource, repositorySource]) {
    const registry = createVersionedRuleRegistry(source);
    assert.match(sql, new RegExp(registry.manifestHash));
    for (const rule of registry.rules) {
      assert.ok(sql.includes(rule.id));
      assert.ok(sql.includes(rule.definitionHash));
      assert.ok(sql.includes(rule.remediation.replace(/'/g, "''")));
    }
  }
  assert.ok(sql.includes('GuardAI Rule definition hash conflict'));
});

test('SQL literal escaping never permits a quote to terminate generated text', () => {
  assert.equal(sqlLiteral("don't"), "'don''t'");
});

test('same canonical registries generate byte-identical seed SQL', () => {
  assert.equal(buildRuleSeedSql(), buildRuleSeedSql());
});
