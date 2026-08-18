-- GuardAI repository baseline Rule + scoring provenance draft
-- NOT an applied migration. Consolidate after the existing rule/scoring provenance drafts.
-- These are technical detector rules, not legal-compliance controls and not a claim of
-- comprehensive SAST, secret scanning, dependency vulnerability analysis or SBOM coverage.

begin;

insert into public.rules (id, category, title, current_version, active)
values
  ('repository.secret.private_key', 'secret-indicators', 'Private key material indicator', 1, true),
  ('repository.secret.github_token', 'secret-indicators', 'GitHub token indicator', 1, true),
  ('repository.secret.aws_access_key', 'secret-indicators', 'AWS access key identifier indicator', 1, true),
  ('repository.secret.stripe_live_key', 'secret-indicators', 'Stripe live secret key indicator', 1, true)
on conflict (id) do nothing;

insert into public.rule_versions (
  rule_id, version, implementation_version, legal_source_ids, definition
)
values
  (
    'repository.secret.private_key', 1, 'repository.baseline@1.0.0', '{}'::uuid[],
    '{"rulesetId":"repository-baseline","controlKey":"private_key","rationale":"Detect high-confidence private-key PEM markers inside the bounded repository text-file sample without persisting matched values.","defaultSeverity":"critical"}'::jsonb
  ),
  (
    'repository.secret.github_token', 1, 'repository.baseline@1.0.0', '{}'::uuid[],
    '{"rulesetId":"repository-baseline","controlKey":"github_token","rationale":"Detect GitHub credential-prefix indicators inside the bounded repository text-file sample without persisting matched values.","defaultSeverity":"critical"}'::jsonb
  ),
  (
    'repository.secret.aws_access_key', 1, 'repository.baseline@1.0.0', '{}'::uuid[],
    '{"rulesetId":"repository-baseline","controlKey":"aws_access_key","rationale":"Detect AWS access-key identifier indicators inside the bounded repository text-file sample. An access-key ID alone is not the secret half of an AWS credential.","defaultSeverity":"critical"}'::jsonb
  ),
  (
    'repository.secret.stripe_live_key', 1, 'repository.baseline@1.0.0', '{}'::uuid[],
    '{"rulesetId":"repository-baseline","controlKey":"stripe_live_key","rationale":"Detect Stripe live secret-key prefix indicators inside the bounded repository text-file sample without persisting matched values.","defaultSeverity":"critical"}'::jsonb
  )
on conflict (rule_id, version) do nothing;

insert into public.scoring_profiles (id, version, description, config)
values (
  'repository-mvp',
  1,
  'Initial GuardAI score for the bounded repository baseline only; 100 means none of the implemented high-confidence credential indicators were observed in the selected sample, while 0 means one or more were observed.',
  '{"modules":{"repository":{"weight":1}},"minimumAssessedModules":1}'::jsonb
)
on conflict (id, version) do nothing;

commit;
