import type { TechnicalReportRecord } from '../types/report';

interface ReportSnapshotViewProps {
  report: TechnicalReportRecord;
  onClose?: () => void;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('de-DE');
}

function severityLabel(value: string): string {
  if (value === 'critical') return 'Kritisch';
  if (value === 'warning') return 'Warnung';
  if (value === 'info') return 'Info';
  return value;
}

export default function ReportSnapshotView({ report, onClose }: ReportSnapshotViewProps) {
  const snapshot = report.snapshot;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 bg-background px-4 py-8 print:max-w-none print:px-0">
      <header className="space-y-4 border-b pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              GuardAI Technical Screening Report
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Technischer Screening-Snapshot</h1>
            <p className="text-sm text-muted-foreground">
              Unveränderlicher Bericht aus gespeicherter technischer Evidence. Keine Zertifizierung und keine Rechtsberatung.
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            {onClose && (
              <button className="rounded-lg border px-3 py-2 text-sm" type="button" onClick={onClose}>
                Schließen
              </button>
            )}
            <button className="rounded-lg border px-3 py-2 text-sm" type="button" onClick={() => window.print()}>
              Drucken
            </button>
          </div>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Report-ID</dt>
            <dd className="break-all font-mono text-xs">{report.id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Erstellt</dt>
            <dd>{formatDate(report.createdAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Snapshot SHA-256</dt>
            <dd className="break-all font-mono text-xs">{report.snapshotHash}</dd>
          </div>
        </dl>
      </header>

      <section className="grid gap-4 rounded-2xl border p-5 md:grid-cols-3">
        <div>
          <div className="text-xs text-muted-foreground">Target beim Scan</div>
          <div className="font-semibold">{snapshot.target.displayName}</div>
          <div className="break-all text-xs text-muted-foreground">{snapshot.target.canonicalUrl ?? '—'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Technischer Score</div>
          <div className="text-3xl font-semibold">{snapshot.scan.overallScore ?? '—'}</div>
          <div className="text-xs text-muted-foreground">Kein Compliance-Zertifikat</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Scoring-Profil</div>
          <div className="font-semibold">{snapshot.scoring.profileId}</div>
          <div className="text-xs text-muted-foreground">Version {snapshot.scoring.profileVersion}</div>
          {snapshot.scoring.profileDefinitionHash && (
            <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
              SHA-256 {snapshot.scoring.profileDefinitionHash}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Scan-Provenienz</h2>
        <dl className="grid gap-3 rounded-2xl border p-5 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Scan-ID</dt>
            <dd className="break-all font-mono text-xs">{snapshot.scan.id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Scanner-Version</dt>
            <dd>{snapshot.scan.scannerVersion}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">API-Contract</dt>
            <dd>{snapshot.scan.contractVersion}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Module</dt>
            <dd>{snapshot.scan.requestedModules.join(', ')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Start</dt>
            <dd>{formatDate(snapshot.scan.startedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Abschluss</dt>
            <dd>{formatDate(snapshot.scan.completedAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-semibold">Findings</h2>
          <div className="text-sm text-muted-foreground">{snapshot.findings.length} im Snapshot</div>
        </div>
        {snapshot.findings.length === 0 ? (
          <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
            Für die ausgeführten automatisierten Checks wurde kein Finding gespeichert. Das beweist nicht die Abwesenheit anderer Risiken.
          </div>
        ) : (
          <div className="space-y-3">
            {snapshot.findings.map((finding) => (
              <article key={finding.findingId} className="space-y-2 rounded-2xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {severityLabel(finding.severity)}
                    </div>
                    <h3 className="font-semibold">{finding.message}</h3>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{finding.ruleId ?? 'Keine Rule-ID'}</div>
                    <div>{finding.ruleVersion === null ? 'Keine Rule-Version' : `Rule v${finding.ruleVersion}`}</div>
                  </div>
                </div>
                {finding.ruleDefinitionHash && (
                  <div className="text-xs text-muted-foreground">
                    Rule Definition SHA-256:{' '}
                    <span className="break-all font-mono">{finding.ruleDefinitionHash}</span>
                  </div>
                )}
                {finding.remediation && <p className="text-sm text-muted-foreground">{finding.remediation}</p>}
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <div>Fingerprint: <span className="break-all font-mono">{finding.fingerprint}</span></div>
                  <div>Status: {finding.status}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-semibold">Evidence-Provenienz</h2>
          <div className="text-sm text-muted-foreground">{snapshot.evidence.length} Evidence-Objekt(e)</div>
        </div>
        <div className="space-y-2">
          {snapshot.evidence.map((item) => (
            <article key={item.id} className="grid gap-2 rounded-xl border p-4 text-sm md:grid-cols-[1fr_auto]">
              <div>
                <div className="font-medium">{item.detectorId} · {item.detectorVersion}</div>
                <div className="break-all text-xs text-muted-foreground">{item.source}</div>
                <div className="mt-1 text-xs text-muted-foreground">Erfasst: {formatDate(item.capturedAt)}</div>
              </div>
              <div className="md:text-right">
                <div className="text-xs text-muted-foreground">Evidence SHA-256</div>
                <div className="max-w-xl break-all font-mono text-xs">{item.contentHash ?? '—'}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {snapshot.scan.notices.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Hinweise</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {snapshot.scan.notices.map((notice) => <li key={notice}>{notice}</li>)}
          </ul>
        </section>
      )}

      <footer className="space-y-2 border-t pt-5">
        <h2 className="font-semibold">Grenzen dieses Reports</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {snapshot.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
        </ul>
        <div className="pt-2 text-xs text-muted-foreground">
          Report-Schema {report.schemaVersion} · Snapshot-Hash {report.snapshotHash}
        </div>
      </footer>
    </main>
  );
}
