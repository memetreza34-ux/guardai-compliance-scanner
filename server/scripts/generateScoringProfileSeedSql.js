const securitySource = require('../../shared/scoring/security-mvp-v1.json');
const repositorySource = require('../../shared/scoring/repository-mvp-v1.json');
const {
  createVersionedScoringProfile,
  scoringProfileDefinition,
} = require('../domain/scoringPolicy');

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonLiteral(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function buildScoringProfileSeedSql(sources = [securitySource, repositorySource]) {
  const profiles = sources.map((source) => createVersionedScoringProfile(source));
  const lines = [
    '-- GENERATED from shared/scoring/*.json by server/scripts/generateScoringProfileSeedSql.js.',
    '-- Do not hand-edit generated scoring profile content or definition hashes.',
    '-- Requires scoring_profiles.definition_hash from the Phase 16 provenance migration.',
    '',
  ];

  for (const profile of profiles) {
    const definition = scoringProfileDefinition(profile);
    const config = {
      modules: definition.modules,
      minimumAssessedModules: definition.minimumAssessedModules,
    };
    lines.push(
      `insert into public.scoring_profiles (id, version, description, config, definition_hash) values (` +
      `${sqlLiteral(profile.profileId)}, ${profile.version}, ${sqlLiteral(profile.description)}, ${jsonLiteral(config)}, ${sqlLiteral(profile.definitionHash)})` +
      ` on conflict (id, version) do update set definition_hash = excluded.definition_hash` +
      ` where public.scoring_profiles.definition_hash is not distinct from excluded.definition_hash;`,
    );
    lines.push(
      `do $$ begin if not exists (` +
      `select 1 from public.scoring_profiles where id = ${sqlLiteral(profile.profileId)} and version = ${profile.version} and definition_hash = ${sqlLiteral(profile.definitionHash)}` +
      `) then raise exception 'GuardAI scoring profile definition hash conflict for ${profile.profileId}@${profile.version}'; end if; end $$;`,
      '',
    );
  }

  lines.push('-- Scoring profile definition hashes for deployment/release evidence:');
  for (const profile of profiles) {
    lines.push(`-- ${profile.profileId}@${profile.version}: ${profile.definitionHash}`);
  }
  return `${lines.join('\n')}\n`;
}

if (require.main === module) process.stdout.write(buildScoringProfileSeedSql());

module.exports = {
  buildScoringProfileSeedSql,
  jsonLiteral,
  sqlLiteral,
};
