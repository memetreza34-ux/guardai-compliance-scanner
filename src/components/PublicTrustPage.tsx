import { useEffect, useState } from 'react';
import { GuardApiError } from '../api/apiClient';
import { fetchPublicTrust } from '../api/trustApi';
import type { PublicTrustProjection } from '../types/trust';

interface PublicTrustPageProps {
  publicSlug: string;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('de-DE');
}

function safeTargetUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default function PublicTrustPage({ publicSlug }: PublicTrustPageProps) {
  const [projection, setProjection] = useState<PublicTrustProjection | null>(null);
  const [error, setError] = useState<GuardApiError | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicTrust(publicSlug)
      .then((next) => {
        if (!cancelled) setProjection(next);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof GuardApiError
              ? loadError
              : new GuardApiError('Public Trust publication could not be loaded.', 'PUBLIC_TRUST_REQUEST_FAILED', 0),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [publicSlug]);

  if (error) {
    const revoked = error.code === 'TRUST_PUBLICATION_REVOKED';
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          GuardAI Public Trust
        </div>
        <h1 className="text-3xl font-semibold">
          {revoked ? 'Diese Veröffentlichung wurde widerrufen' : 'Veröffentlichung nicht verfügbar'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {revoked
            ? 'Der zuvor veröffentlichte technische Screening-Nachweis ist nicht mehr aktiv.'
            : 'Für diesen öffentlichen GuardAI-Link ist kein aktiver technischer Screening-Nachweis verfügbar.'}
        </p>
      </main>
    );
  }

  if (!projection) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-sm text-muted-foreground">Öffentlicher GuardAI-Nachweis wird geladen…</p>
      </main>
    );
  }

  const targetUrl = safeTargetUrl(projection.target.canonicalUrl);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-12">
      <header className="space-y-3 border-b pb-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          GuardAI Public Trust · Technical Screening
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{projection.organization.name}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Dieser öffentliche Nachweis bestätigt ausschließlich, dass der unten angegebene technische GuardAI-Screening-Scope zum angegebenen Zeitpunkt abgeschlossen und als unveränderlicher Report-Snapshot gespeichert wurde.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">Verifiziertes Target im Report</div>
          <div className="font-semibold">{projection.target.displayName}</div>
          {targetUrl ? (
            <a
              className="break-all text-sm underline underline-offset-4"
              href={targetUrl}
              rel="noreferrer noopener"
              target="_blank"
            >
              {projection.target.canonicalUrl}
            </a>
          ) : (
            <div className="break-all text-sm text-muted-foreground">{projection.target.canonicalUrl ?? '—'}</div>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Screening abgeschlossen</div>
          <div className="font-semibold">{formatDate(projection.screening.completedAt)}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Scope: {projection.screening.modules.join(', ') || '—'}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border p-5">
        <h2 className="text-lg font-semibold">Unveränderliche Report-Provenienz</h2>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Report-ID</dt>
            <dd className="break-all font-mono text-xs">{projection.report.id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Report erstellt</dt>
            <dd>{formatDate(projection.report.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Report-Schema</dt>
            <dd>v{projection.report.schemaVersion}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-muted-foreground">Snapshot SHA-256</dt>
            <dd className="break-all font-mono text-xs">{projection.report.snapshotHash}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2 rounded-2xl border p-5">
        <h2 className="font-semibold">Was dieser öffentliche Nachweis nicht aussagt</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {projection.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
        </ul>
      </section>

      <footer className="border-t pt-5 text-xs text-muted-foreground">
        Veröffentlichung: {formatDate(projection.publication.publishedAt)} · Public Trust Schema v{projection.schemaVersion}
      </footer>
    </main>
  );
}
