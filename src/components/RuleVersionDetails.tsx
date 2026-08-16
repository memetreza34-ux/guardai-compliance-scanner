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

  return (
    <article className="space-y-4 rounded-xl border p-4">
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
          <dt className="text-xs text-muted-foreground">Framework</dt>
          <dd>{rule.framework}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Kategorie</dt>
          <dd>{rule.category}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Wirksam ab</dt>
          <dd>{new Date(ruleVersion.effectiveFrom).toLocaleString('de-DE')}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Wirksam bis</dt>
          <dd>{ruleVersion.effectiveTo ? new Date(ruleVersion.effectiveTo).toLocaleString('de-DE') : 'offen'}</dd>
        </div>
      </dl>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Technische Begründung</div>
        <p className="mt-1 text-sm">{ruleVersion.rationale}</p>
      </div>

      {ruleVersion.legalSourceIds.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verknüpfte Quellen</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {ruleVersion.legalSourceIds.length} versionierte Quellenreferenz(en) sind mit dieser Regelversion verknüpft.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Diese Ansicht zeigt die historische Regelrevision, die das Finding erzeugt hat. Spätere Regeländerungen verändern diese Provenance nicht rückwirkend.
      </p>
    </article>
  );
}
