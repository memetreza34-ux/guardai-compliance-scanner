# ADR 0005 — Privacy Scanner uses browser evidence before legal/AI interpretation

**Status:** Accepted for GuardAI source architecture; runtime remains gated.

## Context

GuardAI needs Privacy/consent screening without pretending that a static HTML request can determine GDPR/ePrivacy compliance. Modern websites can create cookies, Web Storage entries and cross-origin network requests only after JavaScript executes. Consent interfaces can also alter runtime behavior.

The old prototype associated Privacy too closely with AI-assisted analysis. That is not the correct technical foundation for a real Privacy scanner.

## Decision

The first persistent GuardAI Privacy module is a **browser-observation capability**.

`privacy` therefore maps to the `browser_scan` entitlement. AI explanation/classification, if later enabled, is a separate layer and must never be the source of raw browser truth.

The first Privacy Evidence model records only bounded, minimized observations:

- final target origin/path,
- same-origin vs cross-origin request counts,
- bounded distinct cross-origin origins,
- resource-type counts,
- cookie counts/domain scope/security attributes **without names or values**,
- Web Storage entry counts **without keys or values**,
- bounded privacy-link targets with query/fragment removed,
- classified consent-control kinds **without visible control text**,
- whether a reject action was attempted/completed,
- an optional post-reject observation phase.

Raw request paths, query strings, fragments, Cookie values, Cookie names, Web Storage keys/values and consent-control text are not persisted in normalized Privacy Evidence.

## What this Evidence does not mean

A cross-origin request is **not automatically a tracker**.

A detected cookie is **not automatically unlawful**.

A missing/detected consent UI element is **not by itself a legal conclusion**.

A technically completed reject action is **not proof that consent was legally valid or that every legal requirement was satisfied**.

GuardAI must keep observations, deterministic technical rules, legal-source mappings and optional AI explanation separate.

## Browser runtime gate

The Privacy module remains absent from `ENABLED_PERSISTENT_SCAN_MODULES` until all of the following are implemented and validated:

1. isolated browser runtime/provider,
2. strict navigation/SSRF policy for every browser request,
3. bounded page/runtime/network/resource budgets,
4. deterministic observation phases,
5. robust consent-control discovery with confidence/coverage semantics,
6. explicit behavior when no reliable reject control can be identified,
7. screenshots/DOM artifacts policy decided with privacy minimization,
8. source tests plus real staging browser fixtures,
9. versioned Privacy Rules created only for checks whose technical meaning is defensible,
10. scoring profile created only after coverage semantics are defined.

## Consent interaction direction

The initial state machine should distinguish:

```text
initial observation
→ consent surface detected / not reliably detected
→ reject control identified / not reliably identified
→ reject action attempted
→ action completed / failed / ambiguous
→ post-reject observation
```

No state may silently fall back to `passed`.

## Network classification direction

The first evidence layer uses `same-origin` / `cross-origin`, because those facts can be computed without a Public Suffix List or vendor-tracker database.

If GuardAI later labels a request as analytics/advertising/tracker, that classification must come from a separately versioned source/registry with provenance and update policy.

## Consequences

### Positive

- browser truth is separated from interpretation,
- raw PII-bearing values are minimized before persistence,
- AI cannot invent network/cookie facts,
- legal overclaiming is reduced,
- future tracker/vendor registries can be versioned independently.

### Cost

- Privacy remains unavailable longer,
- browser infrastructure and fixtures are required,
- a meaningful Privacy score cannot be introduced yet.

That delay is intentional. GuardAI should prefer `not assessed` over a fabricated Privacy score.
