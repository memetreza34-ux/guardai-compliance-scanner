import { useEffect, useState, type FormEvent } from 'react';
import { GuardApiError } from '../api/apiClient';
import type { FindingApi } from '../api/findingApi';
import type {
  FindingLifecycleStatus,
  FindingStatusEvent,
  WorkspaceFindingSummary,
} from '../types/findingLifecycle';
import type { OrganizationRole } from '../types/workspace';

interface FindingLifecyclePanelProps {
  api: FindingApi;
  organizationId: string;
  role: OrganizationRole;
}

function readableError(error: unknown): string {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  if (error instanceof Error) return error.message;
  return 'Unbekannter Fehler.';
}

function canMutate(role: OrganizationRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'member';
}

function canAcceptRisk(role: OrganizationRole): boolean {
  return role === 'owner' || role === 'admin';
}

export default function FindingLifecyclePanel({
  api,
  organizationId,
  role,
}: FindingLifecyclePanelProps) {
  const [statusFilter, setStatusFilter] = useState<FindingLifecycleStatus | 'all'>('open');
  const [findings, setFindings] = useState<WorkspaceFindingSummary[]>([]);
  const [history, setHistory] = useState<{ findingId: string; events: FindingStatusEvent[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const page = await api.listFindings(organizationId, {
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 100,
    });
    setFindings(page.findings);
  }

  useEffect(() => {
    let cancelled = false;
    api.listFindings(organizationId, {
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 100,
    })
      .then((page) => {
        if (!cancelled) setFindings(page.findings);
      })
      .catch((loadError) => {
        if (!cancelled) setError(readableError(loadError));
      });

    return () => {
      cancelled = true;
    };
  }, [api, organizationId, statusFilter]);

  async function runAction(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(readableError(actionError));
    } finally {
      setBusy(null);
    }
  }

  async function changeStatus(
    finding: WorkspaceFindingSummary,
    status: FindingLifecycleStatus,
    reason?: string | null,
  ) {
    await runAction(`status:${finding.id}`, async () => {
      await api.updateFindingStatus(organizationId, finding.id, status, reason);
      await load();
    });
  }

  async function acceptRisk(event: FormEvent<HTMLFormElement>, finding: WorkspaceFindingSummary) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = String(form.get('reason') ?? '').trim();
    await changeStatus(finding, 'accepted_risk', reason);
    event.currentTarget.reset();
  }

  async function loadHistory(finding: WorkspaceFindingSummary) {
    await runAction(`history:${finding.id}`, async () => {
      const page = await api.getFindingHistory(organizationId, finding.id, { limit: 100 });
      setHistory({ findingId: finding.id, events: page.events });
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Finding Lifecycle
          </div>
          <h2 className="text-xl font-semibold">Technische Findings verwalten</h2>
          <p className="text-sm text-muted-foreground">
            Scanner-Wiedererkennung öffnet ein aufgelöstes Finding erneut. Eine bewusste Risikoakzeptanz bleibt bestehen, bis ein Admin sie ändert.
          </p>
        </div>
        <label className="space-y-1 text-sm">
          <span>Status</span>
          <select
            className="block rounded-lg border bg-background px-3 py-2"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as FindingLifecycleStatus | 'all')}
          >
            <option value="open">Offen</option>
            <option value="resolved">Aufgelöst</option>
            <option value="accepted_risk">Risiko akzeptiert</option>
            <option value="all">Alle</option>
          </select>
        </label>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {error}
        </div>
      )}

      {findings.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Für diesen Filter wurden keine Findings gefunden.
        </p>
      )}

      <div className="space-y-3">
        {findings.map((finding) => (
          <article key={finding.id} className="space-y-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{finding.ruleTitle ?? finding.ruleId ?? 'Technisches Finding'}</h3>
                <p className="text-xs text-muted-foreground">
                  Regel {finding.ruleId ?? '—'} · zuletzt gesehen {new Date(finding.lastSeenAt).toLocaleString('de-DE')}
                </p>
              </div>
              <span className="rounded-full border px-2.5 py-1 text-xs font-medium">
                {finding.status}
              </span>
            </div>

            {finding.statusReason && (
              <p className="rounded-lg bg-muted p-3 text-sm">
                Statusgrund: {finding.statusReason}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {canMutate(role) && finding.status !== 'resolved' && (
                <button
                  className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => changeStatus(finding, 'resolved', 'Marked resolved after remediation review.')}
                >
                  Als aufgelöst markieren
                </button>
              )}
              {canMutate(role) && finding.status === 'resolved' && (
                <button
                  className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => changeStatus(finding, 'open', 'Reopened for further remediation.')}
                >
                  Wieder öffnen
                </button>
              )}
              {canAcceptRisk(role) && finding.status === 'accepted_risk' && (
                <button
                  className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                  type="button"
                  disabled={busy !== null}
                  onClick={() => changeStatus(finding, 'open', 'Risk acceptance withdrawn by administrator.')}
                >
                  Risikoakzeptanz zurückziehen
                </button>
              )}
              <button
                className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                type="button"
                disabled={busy !== null}
                onClick={() => loadHistory(finding)}
              >
                Status-Historie
              </button>
            </div>

            {canAcceptRisk(role) && finding.status !== 'accepted_risk' && (
              <form className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row" onSubmit={(event) => acceptRisk(event, finding)}>
                <input
                  className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                  name="reason"
                  minLength={10}
                  maxLength={2000}
                  placeholder="Begründung für die Risikoakzeptanz"
                  required
                />
                <button
                  className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50"
                  type="submit"
                  disabled={busy !== null}
                >
                  Risiko akzeptieren
                </button>
              </form>
            )}

            {history?.findingId === finding.id && (
              <div className="space-y-2 border-t pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historie</div>
                {history.events.map((event) => (
                  <div key={event.id} className="rounded-lg bg-muted p-3 text-xs">
                    <div className="font-medium">
                      {event.fromStatus ?? 'neu'} → {event.toStatus}
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString('de-DE')}
                      {event.reason ? ` · ${event.reason}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
