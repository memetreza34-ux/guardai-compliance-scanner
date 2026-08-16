# ADR 0004 — GitHub App for GuardAI repository integration

- Status: Accepted
- Date: 2026-08-16

## Problem

GuardAI needs repository access for the future dependency, secret, SAST, config and SBOM scanners without asking customers for long-lived personal access tokens or organization-wide credentials.

## Decision

Use a dedicated GuardAI GitHub App as the first repository provider integration.

The GitHub App installation is mapped to exactly one GuardAI Organization. Customers choose the repositories granted to the GitHub App in GitHub. GuardAI then uses short-lived installation access tokens for API access.

## Security rules

1. GitHub App private key, client secret and webhook secret are server-only.
2. No GitHub installation access token is persisted in GuardAI PostgreSQL.
3. Installation tokens are created only when needed and held in process memory for their short lifetime.
4. GuardAI asks for the minimum GitHub App permissions needed by implemented repository scanners. Permissions are expanded only when a real scanner needs them.
5. Installation setup uses a high-entropy state secret; GuardAI stores only the SHA-256 hash and expiration.
6. A callback is accepted only after the state matches an unused, unexpired GuardAI Organization state.
7. GuardAI then fetches the installation from GitHub using authenticated App credentials; callback query parameters alone are never trusted as installation truth.
8. One GitHub installation ID can map to only one GuardAI Organization.
9. GitHub webhook deliveries are verified against the exact raw body with `X-Hub-Signature-256` before any state change.
10. Webhook deliveries are deduplicated by GitHub delivery ID.
11. Installation suspension/deletion immediately makes the integration unusable for new repository scans.
12. Repository access is re-read from GitHub rather than trusting a stale browser-supplied repository list.
13. Repository targets must keep provider repository ID/full-name provenance; changing a repository selection never rewrites historical Scan Evidence.
14. The existing connected ChatGPT GitHub connector is not the GuardAI production integration and is not used as customer product infrastructure.

## Initial permissions

The GitHub App manifest/configuration will start with read-only repository metadata/content permissions required by implemented scanner modules. No write permission is requested for the repository-scanning MVP.

Exact permission names are verified against current GitHub App documentation when the real App is created in staging.

## Authentication model

```text
GuardAI server
→ signs short-lived GitHub App JWT with private key
→ exchanges JWT for installation access token
→ calls GitHub REST APIs for that installation
→ discards token after use / memory cache expiry
```

## Installation flow

```text
GuardAI admin+
→ POST create installation state
→ server returns GitHub App installation URL
→ user installs/selects repositories in GitHub
→ GitHub returns to GuardAI setup callback
→ server validates one-time state
→ server fetches installation from GitHub
→ stores Organization ↔ installation provenance
→ repository list is read from GitHub using installation token
```

## Webhooks

Initial relevant events include installation lifecycle and repository-selection changes. Webhook side effects are idempotent and never trust an unsigned body.

## Consequences

### Benefits

- no customer PAT storage,
- fine-grained installation/repository access,
- short-lived runtime credentials,
- GitHub-native installation lifecycle,
- clear future path to repository targets/scanners.

### Costs

- requires dedicated GitHub App configuration per environment,
- webhook and installation lifecycle must be reconciled,
- GitHub permission changes require careful review and customer visibility.

## Not included yet

- real repository scanner implementation,
- GitHub Checks/PR write-back,
- automatic remediation PRs,
- GitHub Actions installation,
- Enterprise Server support.

Those are later capabilities and must not be implied by the initial integration.
