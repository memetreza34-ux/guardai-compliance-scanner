import { useEffect, useState } from 'react';
import { GuardApiError } from '../api/apiClient';
import { completeGitHubInstallation } from '../api/githubIntegrationApi';
import type { GitHubInstallationCompletion } from '../types/githubIntegration';

function readableError(error: unknown): string {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'GitHub-Installation konnte nicht abgeschlossen werden.';
}

export default function GitHubIntegrationCallbackPage() {
  const [result, setResult] = useState<GitHubInstallationCompletion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const state = params.get('state');
    const installationId = params.get('installation_id');
    if (!state || !installationId) {
      setError('GitHub-Callback enthält nicht die erforderlichen Installationsdaten.');
      return undefined;
    }

    completeGitHubInstallation(state, installationId)
      .then((next) => {
        if (!cancelled) setResult(next);
      })
      .catch((callbackError) => {
        if (!cancelled) setError(readableError(callbackError));
      })
      .finally(() => {
        // Remove the one-time state from browser history after it has been consumed/attempted.
        if (!cancelled) window.history.replaceState({}, '', '/integrations/github/callback');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-16">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        GuardAI · GitHub Integration
      </div>
      {error ? (
        <>
          <h1 className="text-3xl font-semibold">GitHub-Verbindung nicht abgeschlossen</h1>
          <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            {error}
          </div>
        </>
      ) : result ? (
        <>
          <h1 className="text-3xl font-semibold">GitHub App verbunden</h1>
          <p className="text-sm text-muted-foreground">
            Provider-Konto: {result.accountLogin} · Status: {result.status}. Repository-Scans sind dadurch noch nicht automatisch aktiviert.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold">GitHub-Installation wird verifiziert…</h1>
          <p className="text-sm text-muted-foreground">
            GuardAI prüft den one-time State und liest die Installation direkt bei GitHub nach.
          </p>
        </>
      )}
      <a className="inline-flex rounded-lg border px-4 py-2 text-sm font-medium" href="/">
        Zur GuardAI-App
      </a>
    </main>
  );
}
