# ADR 0006 — Browser workers require isolated runtime and connection-time egress enforcement

**Status:** Accepted architecture gate. No GuardAI browser module is enabled yet.

## Context

Privacy and Accessibility need a real browser because JavaScript execution changes DOM, network requests, cookies, storage and consent behavior.

A normal application-level URL validation step is not sufficient for a browser worker. The browser process performs its own DNS resolution and network connections. A request-interception callback that validates a hostname before continuing does not by itself prove that the browser later connected to the same public IP address; DNS rebinding and browser-controlled subresource connections remain concerns.

GuardAI already has connection-time protection for its direct HTTP scanner through a custom safe DNS lookup. Browser workers need an equivalent or stronger boundary.

## Decision

Privacy and Accessibility browser jobs run in a **separate isolated worker runtime** and remain absent from `ENABLED_PERSISTENT_SCAN_MODULES` until connection-time network enforcement exists.

Required architecture:

1. API process does not launch customer-controlled browser pages.
2. Browser runs in a dedicated worker/container/process boundary with no customer credentials mounted.
3. Browser uses an outbound enforcement layer (for example a controlled egress proxy or equivalent network policy) that blocks private, loopback, link-local, metadata, multicast/reserved and disallowed destinations at connection time.
4. Every HTTP redirect/subresource destination is subject to the same egress policy.
5. Direct access to cloud metadata endpoints and local service networks is denied independently of application logic.
6. Browser worker has no inbound network listener exposed to scanned pages.
7. Browser profile is ephemeral per job.
8. Downloads are disabled unless a future module explicitly designs a quarantined download path.
9. New pages/popups are either blocked or separately budgeted and policy-checked.
10. Service workers/background activity are disabled where practical or cleared at job end.
11. Browser process has bounded CPU, memory, wall-clock and filesystem resources.
12. Browser job uses a bounded request count and aggregate response-byte budget.
13. Screenshots/DOM snapshots are not persisted by default; any future persistence requires a separate data-minimization policy.
14. Raw browser console/network payloads are not written to application logs.

## Two-layer URL policy

GuardAI may still perform application-level URL validation before navigation for fast rejection and better errors. That is defense in depth only.

The authoritative SSRF/network boundary for browser modules is the connection-time egress layer.

```text
Target authorization
→ application URL validation
→ isolated browser worker
→ connection-time egress enforcement
→ browser observation
→ data minimization
→ Evidence persistence
```

## Initial browser budgets

Exact production values must be measured in staging. Source defaults should remain conservative and versioned. The first design target is:

- one top-level target page per Privacy/Accessibility MVP job,
- bounded redirects,
- bounded network request count,
- bounded aggregate transferred bytes,
- bounded execution time,
- no file downloads,
- no authentication prompts/client certificates,
- no reuse of browser state between jobs.

A budget exceedance yields explicit incomplete coverage, never a passing score.

## Privacy-specific consequence

Privacy raw observations are minimized before persistence. Cross-origin requests are observations, not automatic tracker classifications. Cookie/storage values are not stored.

## Accessibility-specific consequence

Accessibility may later use an audited automated engine such as axe inside the isolated browser, but its results still require versioned engine provenance and coverage. Automated WCAG testing is not represented as proof that the site is fully accessible.

## Deployment gate

Before enabling either `privacy` or `accessibility`:

- isolated browser image/process exists,
- egress policy is demonstrated against private/metadata/DNS-rebinding fixtures,
- browser dependency versions are locked,
- resource budgets are tested,
- browser crash/timeouts are retry-classified,
- Evidence minimization is verified,
- staging fixtures prove no cross-tenant/session state reuse.

Until then both modules return `SCAN_MODULE_NOT_AVAILABLE`.
