import { useEffect, useMemo, useState } from 'react';
import { GuardApiError } from '../api/apiClient';
import {
  createScanIdempotencyKey,
  type WorkspaceApi,
} from '../api/workspaceApi';
import type {
  PersistentScanResult,
  TargetVerificationChallenge,
  WorkspaceAuditEvent,
  WorkspaceOrganization,
  WorkspaceTarget,
} from '../types/workspace';

interface WorkspaceOnboardingProps {
  api: WorkspaceApi;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('de-DE');
}

function errorMessage(error: unknown): string {
  if (error instanceof GuardApiError) {
    return `${error.message} (${error.code})`;
  }
  if (error instanceof Error) return error.message;
  return 'Unbekannter Fehler.';
}

function isAdmin(role: WorkspaceOrganization['role'] | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

function canRunScan(role: WorkspaceOrganization['role'] | undefined): boolean {
  return role === 'owner' || role === 'admin' || role === 'member';
}

export default function WorkspaceOnboarding({ api }: WorkspaceOnboardingProps) {
  const [organizations, setOrganizations] = useState<WorkspaceOrganization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [targets, setTargets] = useState<WorkspaceTarget[]>([]);
  const [targetUrl, setTargetUrl] = useState('');
  const [targetName, setTargetName] = useState('');
  const [challenge, setChallenge] = useState<{
    targetId: string;
    value: TargetVerificationChallenge;
  } | null>(null);
  const [scanResult, setScanResult] = useState<PersistentScanResult | null>(null);
  const [auditEvents, setAuditEvents] = useState<WorkspaceAuditEvent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === organizationId),
    [organizations, organizationId],
  );

  async function loadOrganizations(selectId?: string) {
    const next = await api.listOrganizations();
    setOrganizations(next);
    setOrganizationId((current) => {
      if (selectId && next.some((organization) => organization.id === selectId)) return selectId;
      if (current && next.some((organization) => organization.id === current)) return current;
      return next[0]?.id ?? '';
    });
  }

  async function loadTargets(nextOrganizationId: string) {
    if (!nextOrganizationId) {
      setTargets([]);
      return;
    }
    const next = await api.listTargets(nextOrganizationId);
    setTargets(next);
  }

  useEffect(() => {
    let cancelled = false;
    api.listOrganizations()
      .then((next) => {
        if (cancelled) return;
        setOrganizations(next);
        setOrganizationId(next[0]?.id ?? '');
      })
      .catch((loadError) => {
        if (!cancelled) setError(errorMessage(loadError));
      });

    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    if (!organizationId) {
      setTargets([]);
      return undefined;
    }

    api.listTargets(organizationId)
      .then((next) => {
        if (!cancelled) setTargets(next);
      })
      .catch((loadError) => {
        if (!cancelled) setError(errorMessage(loadError));
      });

    return () => {
      cancelled = true;
    };
  }, [api, organizationId]);

  useEffect(() => {
    if (!scanResult || !organizationId) return undefined;
    if (!['queued', 'running'].includes(scanResult.scan.status)) return undefined;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const next = await api.getScanStatus(organizationId, scanResult.scan.id);
        if (!cancelled) setScanResult(next);
      } catch (pollError) {
        if (!cancelled) setError(errorMessage(pollError));
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [api, organizationId, scanResult]);

  async function runAction(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction('create-organization', async () => {
      const created = await api.createOrganization(organizationName);
      setOrganizationName('');
      await loadOrganizations(created.id);
    });
  }

  async function handleCreateTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    await runAction('create-target', async () => {
      await api.createWebsiteTarget(organizationId, {
        url: targetUrl,
        displayName: targetName || undefined,
      });
      setTargetUrl('');
      setTargetName('');
      await loadTargets(organizationId);
    });
  }

  async function handleStartVerification(target: WorkspaceTarget) {
    await runAction(`verify-start:${target.id}`, async () => {
      const value = await api.startTargetVerification(organizationId, target.id);
      setChallenge({ targetId: target.id, value });
      await loadTargets(organizationId);
    });
  }

  async function handleCheckVerification(target: WorkspaceTarget) {
    await runAction(`verify-check:${target.id}`, async () => {
      const result = await api.checkTargetVerification(organizationId, target.id);
      await loadTargets(organizationId);
      if (result.verified) {
        setChallenge((current) => current?.targetId === target.id ? null : current);
      }
    });
  }

  async function handleStartScan(target: WorkspaceTarget) {
    await runAction(`scan:${target.id}`, async () => {
      const submission = await api.submitScan(
        organizationId,
        target.id,
        ['security'],
        createScanIdempotencyKey(),
      );
      const result = await api.getScanStatus(organizationId, submission.scan.id);
      setScanResult(result);
    });
  }

  async function handleLoadAudit() {
    await runAction('audit', async () => {
      const page = await api.listAuditEvents(organizationId, { limit: 50 });
      setAuditEvents(page.events);
    });
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Persistent GuardAI Workspace
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Workspace & technischer Security-Scan</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Dieser Pfad nutzt ausschließlich authentifizierte Organizations, verifizierte Website-Targets,
          persistente Jobs sowie gespeicherte Evidence. Er ist keine Compliance-Zertifizierung und kein Penetrationstest.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      )}

      <section className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-semibold">1. Workspace</h2>
          {organizations.length > 0 ? (
            <label className="block space-y-1 text-sm">
              <span>Aktiver Workspace</span>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2"
                value={organizationId}
                onChange={(event) => {
                  setOrganizationId(event.target.value);
                  setChallenge(null);
                  setScanResult(null);
                  setAuditEvents([]);
                }}
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} · {organization.role}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-muted-foreground">Noch kein Workspace vorhanden.</p>
          )}
        </div>

        <form className="space-y-3" onSubmit={handleCreateOrganization}>
          <h2 className="font-semibold">Workspace anlegen</h2>
          <input
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="z. B. Muster GmbH"
            maxLength={160}
            required
          />
          <button
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            type="submit"
            disabled={busy !== null}
          >
            {busy === 'create-organization' ? 'Wird angelegt…' : 'Workspace anlegen'}
          </button>
        </form>
      </section>

      {selectedOrganization && (
        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <div>
            <h2 className="font-semibold">2. Website-Targets</h2>
            <p className="text-sm text-muted-foreground">
              Rolle: {selectedOrganization.role}. Ein persistenter Scan ist erst nach DNS-Verifikation möglich.
            </p>
          </div>

          {isAdmin(selectedOrganization.role) && (
            <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleCreateTarget}>
              <input
                className="rounded-lg border bg-background px-3 py-2 text-sm"
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                placeholder="example.com"
                maxLength={2048}
                required
              />
              <input
                className="rounded-lg border bg-background px-3 py-2 text-sm"
                value={targetName}
                onChange={(event) => setTargetName(event.target.value)}
                placeholder="Optionaler Anzeigename"
                maxLength={200}
              />
              <button
                className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
                type="submit"
                disabled={busy !== null}
              >
                {busy === 'create-target' ? 'Wird angelegt…' : 'Target anlegen'}
              </button>
            </form>
          )}

          <div className="space-y-3">
            {targets.length === 0 && (
              <p className="text-sm text-muted-foreground">Noch keine Targets in diesem Workspace.</p>
            )}
            {targets.map((target) => {
              const currentChallenge = challenge?.targetId === target.id ? challenge.value : null;
              return (
                <article key={target.id} className="space-y-3 rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{target.displayName}</h3>
                      <p className="break-all text-xs text-muted-foreground">{target.canonicalUrl}</p>
                    </div>
                    <span className="rounded-full border px-2.5 py-1 text-xs">
                      {target.verificationState}
                    </span>
                  </div>

                  {currentChallenge && (
                    <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
                      <strong>DNS-TXT-Challenge</strong>
                      <div>
                        <div className="text-xs text-muted-foreground">Name</div>
                        <code className="break-all">{currentChallenge.dnsRecordName}</code>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Wert</div>
                        <code className="break-all">{currentChallenge.dnsRecordValue}</code>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ablauf: {formatDate(currentChallenge.expiresAt)}. Der Challenge-Wert wird nur in dieser Sitzung gehalten.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {isAdmin(selectedOrganization.role) && target.verificationState !== 'verified' && (
                      <button
                        className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                        type="button"
                        disabled={busy !== null}
                        onClick={() => handleStartVerification(target)}
                      >
                        DNS-Verifizierung starten
                      </button>
                    )}
                    {isAdmin(selectedOrganization.role) && target.verificationState === 'pending' && (
                      <button
                        className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                        type="button"
                        disabled={busy !== null}
                        onClick={() => handleCheckVerification(target)}
                      >
                        DNS jetzt prüfen
                      </button>
                    )}
                    {canRunScan(selectedOrganization.role) && target.verificationState === 'verified' && (
                      <button
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                        type="button"
                        disabled={busy !== null}
                        onClick={() => handleStartScan(target)}
                      >
                        Security-Scan starten
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {scanResult && (
        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">3. Persistenter Scan</h2>
              <p className="text-sm text-muted-foreground">Scan-ID: {scanResult.scan.id}</p>
            </div>
            <span className="rounded-full border px-3 py-1 text-sm font-medium">
              {scanResult.scan.status}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">Technischer Score</div>
              <div className="text-2xl font-semibold">{scanResult.scan.overallScore ?? '—'}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">Evidence</div>
              <div className="text-2xl font-semibold">{scanResult.evidence.length}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-muted-foreground">Findings</div>
              <div className="text-2xl font-semibold">{scanResult.findings.length}</div>
            </div>
          </div>

          {scanResult.scan.errorMessage && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              {scanResult.scan.errorMessage}
            </div>
          )}

          <div className="space-y-2">
            {scanResult.findings.map((finding) => (
              <article key={finding.findingId} className="rounded-xl border p-3 text-sm">
                <div className="font-medium">{finding.severity.toUpperCase()} · {finding.message}</div>
                {finding.remediation && (
                  <p className="mt-1 text-muted-foreground">{finding.remediation}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {selectedOrganization && isAdmin(selectedOrganization.role) && (
        <section className="space-y-3 rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">4. Audit-History</h2>
              <p className="text-sm text-muted-foreground">Nur Owner/Admin. Maximal 50 Einträge in dieser Ansicht.</p>
            </div>
            <button
              className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
              type="button"
              disabled={busy !== null}
              onClick={handleLoadAudit}
            >
              Audit laden
            </button>
          </div>

          <div className="space-y-2">
            {auditEvents.map((event) => (
              <div key={event.id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{event.action}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(event.createdAt)} · {event.targetType ?? 'system'} {event.targetId ?? ''}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
