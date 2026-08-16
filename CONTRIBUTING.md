# Contributing to GuardAI

GuardAI is being rebuilt from a UI-heavy prototype into an evidence-first technical compliance and security SaaS. Changes should follow `docs/GUARDAI_MASTER_BUILD_GUIDE.md` and the active phase tracker.

## Required local runtime

- Node.js: `24.18.1` (see `.nvmrc`)
- npm: `11.16.0` baseline

With nvm:

```bash
nvm install
nvm use
npm ci
```

## Core commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run check
```

`npm run check` is the minimum frontend quality command before a change is considered ready for review.

## Change rules

1. Do not commit `.env` files, credentials, API keys, tokens, uploads, generated caches or local test artifacts.
2. Never convert a scanner failure or unavailable detector into a passing/compliant result.
3. Mock data must be explicitly isolated from the production path.
4. Product copy must describe capabilities that actually exist.
5. Findings need evidence; AI-generated wording is not scan evidence.
6. Client-provided workspace/target IDs never replace server-side authorization.
7. New user-controlled network access must use the GuardAI safe-fetch/SSRF boundary once it exists.
8. New file processing must respect the GuardAI upload-security boundary once it exists.
9. Do not add a large new product surface while the active master-guide phase is unfinished unless the guide is intentionally updated first.
10. Update relevant docs/trackers when architecture, product scope or security assumptions change.

## Pull request scope

Prefer small, reviewable changes. A PR should have one primary purpose and should state:

- what changed,
- why GuardAI needs it,
- security/data implications,
- how it was validated,
- which master-guide phase/checklist items it advances.

## Quality expectations

Before review:

- clean install assumptions remain valid,
- lint passes,
- typecheck passes,
- build passes,
- relevant tests pass once test suites exist,
- no new secret is committed,
- no new P0/P1 issue is knowingly introduced.

## Dependency changes

Do not add dependencies only because they are convenient. For security-sensitive dependencies consider:

- maintenance status,
- known vulnerabilities,
- transitive dependency footprint,
- license,
- runtime permissions/network behavior,
- whether GuardAI can implement the requirement safely without it.

Lockfile changes must be committed together with dependency changes.

## Security-sensitive areas

Changes in these areas require extra review and tests:

- authentication/session handling,
- workspace authorization/tenant isolation,
- URL fetching/crawling,
- redirects/DNS/IP resolution,
- uploads/parsers,
- billing webhooks,
- GitHub/OAuth tokens,
- AI prompts/tool access,
- public Trust Center/badges,
- evidence/report integrity.

## Product-claim rule

A visible GuardAI claim must be backed by implemented behavior. If a capability is still a prototype, demo or Labs feature, say so clearly rather than presenting it as verified production functionality.
