-- GuardAI GitHub repository Target provenance draft
-- NOT an applied migration. Provider-authorized repository Targets must retain enough
-- non-secret installation/repository identity to re-evaluate authorization later.

begin;

alter table public.targets
  add constraint targets_github_repository_provenance check (
    not (type = 'repository' and provider = 'github')
    or (
      canonical_url ~ '^https://github\.com/[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}/?$'
      and verification_metadata ? 'githubInstallationId'
      and verification_metadata ? 'githubRepositoryId'
      and verification_metadata ? 'fullName'
      and verification_metadata->>'githubInstallationId' ~ '^[1-9][0-9]*$'
      and verification_metadata->>'githubRepositoryId' ~ '^[1-9][0-9]*$'
      and verification_metadata->>'fullName' ~ '^[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$'
      and verification_state in ('verified','failed')
    )
  );

create unique index targets_github_repository_provider_id_unique
on public.targets(
  organization_id,
  provider,
  (verification_metadata->>'githubRepositoryId')
)
where type = 'repository' and provider = 'github';

create index targets_github_installation_idx
on public.targets(
  organization_id,
  (verification_metadata->>'githubInstallationId')
)
where type = 'repository' and provider = 'github';

commit;
