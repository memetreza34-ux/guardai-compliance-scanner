# ADR 0007 — Accessibility automation is Evidence, not complete conformance certification

**Status:** Accepted architecture gate. Accessibility module remains disabled.

## Context

GuardAI intends to add automated Accessibility screening for websites. A browser-based engine can identify many deterministic issues, but automated checks cover only a subset of accessibility requirements. Some rules require human judgment, context, assistive-technology testing or task-based review.

The product must therefore avoid turning an automated engine result into a claim of full WCAG, BFSG or other legal accessibility conformance.

## Decision

The first GuardAI Accessibility layer is an **automated browser Evidence adapter** behind the shared isolated-browser gate in ADR 0006.

The persisted MVP Evidence includes only:

- GuardAI detector version,
- underlying engine ID/version,
- tested final origin/path,
- engine rule IDs,
- engine impact category,
- bounded standard/rule tags,
- bounded HTTPS help URL without query/fragment,
- affected-node count per rule,
- separate `violation`, `incomplete`, `pass` summary groups.

The MVP Evidence deliberately does **not** persist:

- raw HTML,
- element text,
- screenshots,
- full CSS/XPath selectors,
- engine failure-summary strings,
- browser console contents,
- arbitrary page DOM snapshots.

These exclusions reduce unnecessary customer-content persistence and avoid accidentally storing sensitive rendered data.

## No score yet

GuardAI does not create an Accessibility numeric score until all of the following are defined and tested:

1. isolated browser runtime + connection-time egress policy,
2. exact automated engine/version locked,
3. WCAG tag/scope policy,
4. viewport/device profile,
5. page-load/readiness policy,
6. coverage model for incomplete/manual checks,
7. multi-page sampling policy if introduced,
8. deterministic severity/weighting policy,
9. versioned scoring profile,
10. UI language that never equates automated score with full conformance.

Until then `accessibility` stays out of `ENABLED_PERSISTENT_SCAN_MODULES` and should display `not assessed` rather than a fabricated score.

## Incomplete/manual checks

Engine results marked incomplete, needs-review or equivalent are never merged into pass or violation counts. They remain a distinct evidence category.

A later UI should surface this as `Requires manual review` rather than silently dropping it.

## Rule provenance

If GuardAI later turns selected engine rule IDs into persistent Findings, GuardAI will maintain its own versioned mapping:

```text
engine ID/version + engine rule ID
→ GuardAI Rule ID/version
→ technical severity/remediation
→ optional standards/legal-source references
```

Updating the engine or mapping creates new provenance/versioning; historical Scan Findings remain bound to their original versions.

## Legal/standards wording

Automated detection may be described as:

- automated Accessibility observation,
- potential accessibility issue,
- automated rule failed,
- requires manual review,
- not assessed.

It may not be described solely from automation as:

- fully WCAG compliant,
- BFSG certified,
- accessible to all users,
- complete accessibility audit.

## Consequence

GuardAI accepts a slower Accessibility release in exchange for a defensible evidence model and honest coverage semantics.
