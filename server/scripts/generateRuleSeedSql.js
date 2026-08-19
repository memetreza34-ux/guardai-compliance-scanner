const securitySource = require('../../shared/rules/security-baseline.json');
const repositorySource = require('../../shared/rules/repository-baseline.json');
const { createVersionedRuleRegistry } = require('../rules/versionedRuleRegistry');

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonLiteral(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function canonicalRuleDefinition(rule) {
  return {
    findingId: rule.findingId,
    category: rule.category,
    defaultSeverity: rule.defaultSeverity,
    evidenceRequirements: [...rule.evidenceRequirements],
    detectorLogic: rule.detectorLogic,
    severityLogic: rule.severityLogic,
    confidenceLogic: rule.confidenceLogic,
    messageTemplate: rule.messageTemplate,
    remediation: rule.remediation,
    requirementMappings: [...rule.requirementMappings],
    changelog: rule.changelog,
  };
}

function buildRuleSeedSql(sources = [securitySource, repositorySource]) {
  const registries = sources.map((source) => createVersionedRuleRegistry(source));
  const rules = registries.flatMap((registry) => registry.rules.map((rule) => ({ registry, rule })));

  const lines = [
    '-- GENERATED from shared/rules/*.json by server/scripts/generateRuleSeedSql.js.',
    '-- Do not hand-edit generated Rule content or definition hashes.',
    '-- Requires rule_versions.definition_hash from the Phase 15 provenance migration.',
    '',
  ];

  for (const { registry, rule } of rules) {
    lines.push(
      `insert into public.rules (id, category, title, current_version, active) values (${sqlLiteral(rule.id)}, ${sqlLiteral(rule.category)}, ${sqlLiteral(rule.title)}, ${rule.version}, true)` +
      ` on conflict (id) do update set category = excluded.category, title = excluded.title, current_version = greatest(public.rules.current_version, excluded.current_version), updated_at = now();`,
    );
    lines.push(
      `insert into public.rule_versions (rule_id, version, implementation_version, legal_source_ids, definition, definition_hash) values (` +
      `${sqlLiteral(rule.id)}, ${rule.version}, ${sqlLiteral(`${registry.detectorId}@${registry.detectorVersion}`)}, '{}'::uuid[], ${jsonLiteral({
        rulesetId: registry.rulesetId,
        rulesetVersion: registry.rulesetVersion,
        detectorId: registry.detectorId,
        detectorVersion: registry.detectorVersion,
        rule: canonicalRuleDefinition(rule),
      })}, ${sqlLiteral(rule.definitionHash)})` +
      ` on conflict (rule_id, version) do update set definition_hash = excluded.definition_hash` +
      ` where public.rule_versions.definition_hash is not distinct from excluded.definition_hash;`,
    );
    lines.push(
      `do $$ begin if not exists (` +
      `select 1 from public.rule_versions where rule_id = ${sqlLiteral(rule.id)} and version = ${rule.version} and definition_hash = ${sqlLiteral(rule.definitionHash)}` +
      `) then raise exception 'GuardAI Rule definition hash conflict for ${rule.id}@${rule.version}'; end if; end $$;`,
      '',
    );
  }

  lines.push('-- Ruleset manifest hashes for deployment/release evidence:');
  for (const registry of registries) {
    lines.push(`-- ${registry.rulesetId}@${registry.rulesetVersion}: ${registry.manifestHash}`);
  }
  return `${lines.join('\n')}\n`;
}

if (require.main === module) {
  process.stdout.write(buildRuleSeedSql());
}

module.exports = {
  buildRuleSeedSql,
  canonicalRuleDefinition,
  jsonLiteral,
  sqlLiteral,
};
