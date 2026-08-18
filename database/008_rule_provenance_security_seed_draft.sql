-- GuardAI rule provenance + Security baseline seed draft
-- NOT an applied migration. Consolidate into the first generated GuardAI migration.

begin;

alter table public.finding_instances
  add column rule_id text,
  add column rule_version integer,
  add constraint finding_instances_rule_version_pair
    check ((rule_id is null and rule_version is null) or (rule_id is not null and rule_version is not null)),
  add constraint finding_instances_rule_version_fk
    foreign key (rule_id, rule_version)
    references public.rule_versions(rule_id, version);

create index finding_instances_rule_version_idx
on public.finding_instances(rule_id, rule_version);

insert into public.rules (id, category, title, current_version, active)
values
  ('security.https_transport', 'transport', 'HTTPS transport', 1, true),
  ('security.content_security_policy', 'headers', 'Content-Security-Policy presence', 1, true),
  ('security.strict_transport_security', 'headers', 'Strict-Transport-Security presence', 1, true),
  ('security.frame_protection', 'headers', 'Frame embedding protection', 1, true),
  ('security.content_type_nosniff', 'headers', 'X-Content-Type-Options nosniff', 1, true),
  ('security.cookie_secure', 'cookies', 'Secure attribute on HTTPS cookies', 1, true),
  ('security.mixed_content', 'content', 'Mixed HTTP content on HTTPS document', 1, true)
on conflict (id) do nothing;

insert into public.rule_versions (
  rule_id, version, implementation_version, legal_source_ids, definition
)
values
  (
    'security.https_transport', 1, 'security.headers@1.1.0', '{}'::uuid[],
    '{"rulesetId":"security-baseline","controlKey":"https_transport","rationale":"Detect whether the final validated target URL uses HTTPS.","defaultSeverity":"critical"}'::jsonb
  ),
  (
    'security.content_security_policy', 1, 'security.headers@1.1.0', '{}'::uuid[],
    '{"rulesetId":"security-baseline","controlKey":"content_security_policy","rationale":"Observe whether the final HTTP response contains a Content-Security-Policy header.","defaultSeverity":"critical"}'::jsonb
  ),
  (
    'security.strict_transport_security', 1, 'security.headers@1.1.0', '{}'::uuid[],
    '{"rulesetId":"security-baseline","controlKey":"strict_transport_security","rationale":"For HTTPS targets, observe whether Strict-Transport-Security is present.","defaultSeverity":"warning"}'::jsonb
  ),
  (
    'security.frame_protection', 1, 'security.headers@1.1.0', '{}'::uuid[],
    '{"rulesetId":"security-baseline","controlKey":"frame_protection","rationale":"Observe X-Frame-Options or a CSP frame-ancestors directive.","defaultSeverity":"warning"}'::jsonb
  ),
  (
    'security.content_type_nosniff', 1, 'security.headers@1.1.0', '{}'::uuid[],
    '{"rulesetId":"security-baseline","controlKey":"content_type_nosniff","rationale":"Observe X-Content-Type-Options: nosniff on the final response.","defaultSeverity":"warning"}'::jsonb
  ),
  (
    'security.cookie_secure', 1, 'security.headers@1.1.0', '{}'::uuid[],
    '{"rulesetId":"security-baseline","controlKey":"cookie_secure","rationale":"For cookies set by an HTTPS response, observe whether the Secure attribute is explicitly present.","defaultSeverity":"warning"}'::jsonb
  ),
  (
    'security.mixed_content', 1, 'security.headers@1.1.0', '{}'::uuid[],
    '{"rulesetId":"security-baseline","controlKey":"mixed_content","rationale":"Detect absolute HTTP resource references in the observed HTTPS document.","defaultSeverity":"warning"}'::jsonb
  )
on conflict (rule_id, version) do nothing;

-- These are technical security rules, not claims of statutory violation.
-- A future logic change creates version 2; version 1 remains immutable for historical Scan provenance.

commit;
