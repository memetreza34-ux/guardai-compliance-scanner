-- GuardAI repository baseline Rule + scoring provenance draft
-- NOT an applied migration. Consolidate after the existing rule/scoring provenance drafts.
-- These are technical detector rules, not legal-compliance controls and not a claim of
-- comprehensive SAST, secret scanning, dependency vulnerability analysis or SBOM coverage.

begin;

insert into public.rules (id, framework, category, control_key, title, status)
values
  ('repository.secret.private_key', 'repository-baseline', 'secret-indicators', 'private_key', 'Private key material indicator', 'active'),
  ('repository.secret.github_token', 'repository-baseline', 'secret-indicators', 'github_token', 'GitHub token indicator', 'active'),
  ('repository.secret.aws_access_key', 'repository-baseline', 'secret-indicators', 'aws_access_key', 'AWS access key identifier indicator', 'active'),
  ('repository.secret.stripe_live_key', 'repository-baseline', 'secret-indicators', 'stripe_live_key', 'Stripe live secret key indicator', 'active')
on conflict (id) do nothing;

insert into public.rule_versions (
  rule_id, version, implementation_version, rationale, legal_source_ids,
  effective_from, effective_to, config
)
values
  ('repository.secret.private_key', 1, 'repository.baseline@1.0.0', 'Detect high-confidence private-key PEM markers inside the bounded repository text-file sample without persisting matched values.', '{}'::uuid[], now(), null, '{"defaultSeverity":"critical"}'::jsonb),
  ('repository.secret.github_token', 1, 'repository.baseline@1.0.0', 'Detect GitHub credential-prefix indicators inside the bounded repository text-file sample without persisting matched values.', '{}'::uuid[], now(), null, '{"defaultSeverity":"critical"}'::jsonb),
  ('repository.secret.aws_access_key', 1, 'repository.baseline@1.0.0', 'Detect AWS access-key identifier indicators inside the bounded repository text-file sample. An access-key ID alone is not the secret half of an AWS credential.', '{}'::uuid[], now(), null, '{"defaultSeverity":"critical"}'::jsonb),
  ('repository.secret.stripe_live_key', 1, 'repository.baseline@1.0.0', 'Detect Stripe live secret-key prefix indicators inside the bounded repository text-file sample without persisting matched values.', '{}'::uuid[], now(), null, '{"defaultSeverity":"critical"}'::jsonb)
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
