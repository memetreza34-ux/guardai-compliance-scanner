import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, API_VERSION_PREFIX, GuardApiError } from '../api/apiClient';
import type { ReportApi } from '../api/reportApi';
import type { TrustApi } from '../api/trustApi';
import type { WorkspaceApi } from '../api/workspaceApi';
import type { TechnicalReportRecord } from '../types/report';
import type { TrustPublicationRecord } from '../types/trust';
import type { WorkspaceOrganization } from '../types/workspace';

interface TrustCenterManagerProps {
  reportApi: ReportApi;
  trustApi: TrustApi;
  workspaceApi: WorkspaceApi;
}

function readableError(error: unknown): string {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'Trust-Center-Aktion fehlgeschlagen.';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('de-DE');
}

function canPublish(role: WorkspaceOrganization['role'] | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

export default function TrustCenterManager({
  reportApi,
  trustApi,
  workspaceApi,
}: TrustCenterManagerProps) {
  const [organizations, setOrganizations] = useState<WorkspaceOrganization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [reports, setReports] = useState<TechnicalReportRecord[]>([]);
  const [reportId, setReportId] = useState('');
  const [publications, setPublications] = useState<TrustPublicationRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === organizationId),
    [organizations, organizationId],
  );

  useEffect(() => {
    let cancelled = false;
    workspaceApi.listOrganizations()
      .then((next) => {
        if (cancelled) return;
        setOrganizations(next);
        setOrganizationId(next[0]?.id ?? '');
      })
      .catch((loadError) => {
        if (!cancelled) setError(readableError(loadError));
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceApi]);

  useEffect(() => {
    let cancelled = false;
    setReportId('');
    if (!organizationId) {
      setReports([]);
      setPublications([]);
      return undefined;
    }

    Promise.all([
      reportApi.listReports(organizationId, { limit: 50 }),
      trustApi.list(organizationId, { limit: 50 }),
    ])
      .then(([reportPage, publicationPage]) => {
        if (cancelled) return;
        setReports(reportPage.reports);
        setPublications(publicationPage.publications);
      })
      .catch((loadError) => {
        if (!cancelled) setError(readableError(loadError));
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, reportApi, trustApi]);

  async function reload() {
    const [reportPage, publicationPage] = await Promise.all([
      reportApi.listReports(organizationId, { limit: 50 }),
      trustApi.list(organizationId, { limit: 50 }),
    ]);
    setReports(reportPage.reports);
    setPublications(publicationPage.publications);
  }

  async function publish() {
    if (!reportId || !organizationId) return;
    setBusy(true);
    setError(null);
    try {
      await trustApi.publish(organizationId, reportId);
      setReportId('');
      await reload();
    } catch (publishError) {
      setError(readableError(publishError));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(publicationId: string) {
    setBusy(true);
    setError(null);
    try {
      await trustApi.revoke(organizationId, publicationId);
      await reload();
    } catch (revokeError) {
      setError(readableError(revokeError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
      <header className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Report-backed Trust Center
        </div>
        <h2 className="text-2xl font-semibold">Öffentliche technische Nachweise</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Eine Veröffentlichung verweist nur auf einen unveränderlichen technischen Report-Snapshot. Detaillierte Findings und Evidence werden öffentlich nicht ausgegeben.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Workspace</span>
          <select
            className="w-full rounded-lg border bg-background px-3 py-2"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            disabled={busy || organizations.length === 0}
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} · {organization.role}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <label className="block space-y-1 text-sm">
            <span>Immutable Report-Snapshot</span>
            <select
              className="w-full rounded-lg border bg-background px-3 py-2"
              value={reportId}
              onChange={(event) => setReportId(event.target.value)}
              disabled={busy || !canPublish(selectedOrganization?.role)}
            >
              <option value="">Report auswählen…</option>
              {reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {formatDate(report.createdAt)} · {report.snapshot.target.displayName}
                </option>
              ))}
            </select>
          </label>
          <button
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            type="button"
            disabled={busy || !reportId || !canPublish(selectedOrganization?.role)}
            onClick={publish}
          >
            Öffentlich veröffentlichen
          </button>
          {!canPublish(selectedOrganization?.role) && selectedOrganization && (
            <p className="text-xs text-muted-foreground">Veröffentlichen/Widerrufen erfordert Owner- oder Admin-Rolle.</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Veröffentlichungen</h3>
          <button
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
            type="button"
            disabled={busy || !organizationId}
            onClick={() => {
              setBusy(true);
              setError(null);
              reload()
                .catch((reloadError) => setError(readableError(reloadError)))
                .finally(() => setBusy(false));
            }}
          >
            Aktualisieren
          </button>
        </div>

        {publications.length === 0 ? (
          <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
            Noch kein technischer Report öffentlich veröffentlicht.
          </div>
        ) : (
          <div className="space-y-3">
            {publications.map((publication) => {
              const publicUrl = `${window.location.origin}/trust/${publication.publicSlug}`;
              const badgeUrl = `${API_BASE_URL}${API_VERSION_PREFIX}/public/trust/${publication.publicSlug}/badge.svg`;
              const report = reports.find((item) => item.id === publication.reportSnapshotId);
              return (
                <article key={publication.id} className="space-y-3 rounded-2xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{report?.snapshot.target.displayName ?? publication.targetId}</div>
                      <div className="text-xs text-muted-foreground">
                        {publication.status} · veröffentlicht {formatDate(publication.publishedAt)}
                      </div>
                    </div>
                    {publication.status === 'published' && canPublish(selectedOrganization?.role) && (
                      <button
                        className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
                        type="button"
                        disabled={busy}
                        onClick={() => revoke(publication.id)}
                      >
                        Widerrufen
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 text-xs md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Public Trust URL</span>
                      <input className="w-full rounded-lg border bg-muted px-3 py-2" readOnly value={publicUrl} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-muted-foreground">Badge URL</span>
                      <input className="w-full rounded-lg border bg-muted px-3 py-2" readOnly value={badgeUrl} />
                    </label>
                  </div>

                  {publication.status === 'published' && (
                    <div className="space-y-2 rounded-xl bg-muted p-3">
                      <img src={badgeUrl} alt="GuardAI technical screening" width="360" height="48" />
                      <code className="block overflow-x-auto whitespace-nowrap text-[11px]">
                        {`<img src="${badgeUrl}" alt="GuardAI technical screening">`}
                      </code>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
