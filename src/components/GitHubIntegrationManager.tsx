import { useEffect, useMemo, useState } from 'react';
import { GuardApiError } from '../api/apiClient';
import type { GitHubIntegrationApi } from '../api/githubIntegrationApi';
import type { WorkspaceApi } from '../api/workspaceApi';
import type {
  GitHubInstallation,
  GitHubRepositorySummary,
} from '../types/githubIntegration';
import type { WorkspaceOrganization } from '../types/workspace';

interface GitHubIntegrationManagerProps {
  githubApi: GitHubIntegrationApi;
  workspaceApi: WorkspaceApi;
}

function readableError(error: unknown): string {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'GitHub-Integration fehlgeschlagen.';
}

function isAdmin(role: WorkspaceOrganization['role'] | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

export default function GitHubIntegrationManager({ githubApi, workspaceApi }: GitHubIntegrationManagerProps) {
  const [organizations, setOrganizations] = useState<WorkspaceOrganization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [installation, setInstallation] = useState<GitHubInstallation | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepositorySummary[]>([]);
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
    setRepositories([]);
    if (!organizationId) {
      setInstallation(null);
      return undefined;
    }
    githubApi.getStatus(organizationId)
      .then((next) => {
        if (!cancelled) setInstallation(next);
      })
      .catch((loadError) => {
        if (!cancelled) setError(readableError(loadError));
      });
    return () => {
      cancelled = true;
    };
  }, [githubApi, organizationId]);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(readableError(actionError));
    } finally {
      setBusy(false);
    }
  }

  async function startInstall() {
    await runAction(async () => {
      const session = await githubApi.startInstallation(organizationId);
      window.location.assign(session.url);
    });
  }

  async function loadRepositories() {
    await runAction(async () => {
      setRepositories(await githubApi.listRepositories(organizationId));
    });
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
      <header className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Integrations · GitHub
        </div>
        <h2 className="text-2xl font-semibold">GitHub App Verbindung</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          GuardAI nutzt eine GitHub-App-Installation und kurzlebige Installation Tokens. In dieser Phase werden nur Installation und aktuell freigegebene Repository-Metadaten verwaltet; ein Repository-Scan wird noch nicht behauptet.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      )}

      {organizations.length > 0 && (
        <label className="block max-w-xl space-y-1 text-sm">
          <span>Workspace</span>
          <select
            className="w-full rounded-lg border bg-background px-3 py-2"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            disabled={busy}
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} · {organization.role}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="space-y-4 rounded-2xl border bg-card p-5">
        {installation ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">GitHub Account</div>
                <div className="font-semibold">{installation.accountLogin}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="font-semibold">{installation.status}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">Repository-Auswahl</div>
                <div className="font-semibold">{installation.repositorySelection ?? 'unbekannt'}</div>
              </div>
            </div>

            {installation.status === 'active' ? (
              <button
                className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={loadRepositories}
              >
                Freigegebene Repositories laden
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Die GitHub-Installation ist nicht aktiv. GuardAI fordert in diesem Zustand keine Repository-Tokens an.
              </p>
            )}
          </>
        ) : isAdmin(selectedOrganization?.role) ? (
          <button
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            type="button"
            disabled={busy || !organizationId}
            onClick={startInstall}
          >
            GitHub App installieren
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">Nur Owner/Admin können eine GitHub App installieren.</p>
        )}
      </div>

      {repositories.length > 0 && (
        <div className="space-y-3 rounded-2xl border bg-card p-5">
          <h3 className="font-semibold">Von GitHub aktuell freigegebene Repositories</h3>
          <div className="space-y-2">
            {repositories.map((repository) => (
              <div key={repository.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                <div>
                  <div className="font-medium">{repository.fullName}</div>
                  <div className="text-xs text-muted-foreground">
                    {repository.private ? 'privat' : 'öffentlich'} · Default Branch: {repository.defaultBranch ?? '—'}
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  {repository.archived && <span className="rounded-full border px-2 py-1">archiviert</span>}
                  {repository.disabled && <span className="rounded-full border px-2 py-1">deaktiviert</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
