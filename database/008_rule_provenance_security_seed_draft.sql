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

insert into public.rules (id, framework, category, control_key, title, status)
values
  ('security.https_transport', 'security-baseline', 'transport', 'https_transport', 'HTTPS transport', 'active'),
  ('security.content_security_policy', 'security-baseline', 'headers', 'content_security_policy', 'Content-Security-Policy presence', 'active'),
  ('security.strict_transport_security', 'security-baseline', 'headers', 'strict_transport_security', 'Strict-Transport-Security presence', 'active'),
  ('security.frame_protection', 'security-baseline', 'headers', 'frame_protection', 'Frame embedding protection', 'active'),
  ('security.content_type_nosniff', 'security-baseline', 'headers', 'content_type_nosniff', 'X-Content-Type-Options nosniff', 'active'),
  ('security.cookie_secure', 'security-baseline', 'cookies', 'cookie_secure', 'Secure attribute on HTTPS cookies', 'active'),
  ('security.mixed_content', 'security-baseline', 'content', 'mixed_content', 'Mixed HTTP content on HTTPS document', 'active')
on conflict (id) do nothing;

insert into public.rule_versions (
  rule_id, version, implementation_version, rationale, legal_source_ids,
  effective_from, effective_to, config
)
values
  ('security.https_transport', 1, 'security.headers@1.1.0', 'Detect whether the final validated target URL uses HTTPS.', '{}'::uuid[], now(), null, '{"defaultSeverity":"critical"}'::jsonb),
  ('security.content_security_policy', 1, 'security.headers@1.1.0', 'Observe whether the final HTTP response contains a Content-Security-Policy header.', '{}'::uuid[], now(), null, '{"defaultSeverity":"critical"}'::jsonb),
  ('security.strict_transport_security', 1, 'security.headers@1.1.0', 'For HTTPS targets, observe whether Strict-Transport-Security is present.', '{}'::uuid[], now(), null, '{"defaultSeverity":"warning"}'::jsonb),
  ('security.frame_protection', 1, 'security.headers@1.1.0', 'Observe X-Frame-Options or a CSP frame-ancestors directive.', '{}'::uuid[], now(), null, '{"defaultSeverity":"warning"}'::jsonb),
  ('security.content_type_nosniff', 1, 'security.headers@1.1.0', 'Observe X-Content-Type-Options: nosniff on the final response.', '{}'::uuid[], now(), null, '{"defaultSeverity":"warning"}'::jsonb),
  ('security.cookie_secure', 1, 'security.headers@1.1.0', 'For cookies set by an HTTPS response, observe whether the Secure attribute is explicitly present.', '{}'::uuid[], now(), null, '{"defaultSeverity":"warning"}'::jsonb),
  ('security.mixed_content', 1, 'security.headers@1.1.0', 'Detect absolute HTTP resource references in the observed HTTPS document.', '{}'::uuid[], now(), null, '{"defaultSeverity":"warning"}'::jsonb)
on conflict (rule_id, version) do nothing;

-- The seed contains technical security rules, not claims of statutory violation.
-- A future change to rule logic creates version 2; version 1 remains immutable for historical Scan provenance.

commit;
