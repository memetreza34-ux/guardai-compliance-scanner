import { useEffect, useState } from 'react';
import { GuardApiError } from '../api/apiClient';
import type { RuleApi } from '../api/ruleApi';
import type { RuleCatalogItem, RuleVersionItem } from '../types/ruleCatalog';

interface RuleVersionDetailsProps {
  api: RuleApi;
  ruleId: string;
  version: number;
}

function readableError(error: unknown): string {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  if (error instanceof Error) return error.message;
  return 'Unbekannter Fehler.';
}

export default function RuleVersionDetails({ api, ruleId, version }: RuleVersionDetailsProps) {
  const [rule, setRule] = useState<RuleCatalogItem | null>(null);
  const [ruleVersion, setRuleVersion] = useState<RuleVersionItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRule(null);
    setRuleVersion(null);
    setError(null);

    api.getVersion(ruleId, version)
      .then((result) => {
        if (cancelled) return;
        setRule(result.rule);
        setRuleVersion(result.version);
      })
      .catch((loadError) => {
        if (!cancelled) setError(readableError(loadError));
      });

    return () => {
      cancelled = true;
    };
  }, [api, ruleId, version]);

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        {error}
      </div>
    );
  }

  if (!rule || !ruleVersion) {
    return <div className="text-sm text-muted-foreground">Regelversion wird geladen…</div>;
  }

  const definition = ruleVersion.definition.rule;

  return (
    <article className="space-y-5 rounded-xl border p-4">
      <header>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Rule Provenance
        </div>
        <h3 className="font-semibold">{rule.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {rule.id} · Version {ruleVersion.version} · {ruleVersion.implementationVersion}
        </p>
      </header>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Kategorie</dt>
          <dd>{rule.category}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd>{rule.active ? 'Aktiv' : 'Inaktiv'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Ruleset</dt>
          <dd>{ruleVersion.definition.rulesetId} · v{ruleVersion.definition.rulesetVersion}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Detector</dt>
          <dd>{ruleVersion.definition.detectorId} · {ruleVersion.definition.detectorVersion}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Rule Definition SHA-256</dt>
          <dd className="break-all font-mono text-xs">{ruleVersion.definitionHash}</dd>
        </div>
      </dl>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Benötigte Evidence</h4>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {definition.evidenceRequirements.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Detector-Logik</h4>
          <p className="mt-1 text-sm">{definition.detectorLogic}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Severity-Logik</h4>
          <p className="mt-1 text-sm">{definition.severityLogic}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confidence-Logik</h4>
          <p className="mt-1 text-sm">{definition.confidenceLogic}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Remediation</h4>
          <p className="mt-1 text-sm">{definition.remediation}</p>
        </div>
      </section>

      {ruleVersion.legalSourceIds.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verknüpfte Quellen</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {ruleVersion.legalSourceIds.length} versionierte Quellenreferenz(en) sind mit dieser Regelversion verknüpft.
          </p>
        </section>
      )}

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Changelog</h4>
        <p className="mt-1 text-sm">{definition.changelog}</p>
      </section>

      <p className="text-xs text-muted-foreground">
        Diese Ansicht zeigt die unveränderliche technische Regeldefinition. Eine fachliche Änderung muss als neue Rule-Version veröffentlicht werden und verändert historische Findings nicht rückwirkend.
      </p>
    </article>
  );
}
