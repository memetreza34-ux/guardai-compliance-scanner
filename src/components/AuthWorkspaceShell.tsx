import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createBillingApi } from '../api/billingApi';
import { createReportApi } from '../api/reportApi';
import { createTrustApi } from '../api/trustApi';
import { createWorkspaceApi } from '../api/workspaceApi';
import type {
  AuthSessionAdapter,
  AuthSessionSnapshot,
} from '../auth/sessionAdapter';
import BillingCenter from './BillingCenter';
import ReportCenter from './ReportCenter';
import TrustCenterManager from './TrustCenterManager';
import WorkspaceOnboarding from './WorkspaceOnboarding';

interface AuthWorkspaceShellProps {
  adapter: AuthSessionAdapter;
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'Authentifizierung fehlgeschlagen.';
}

export default function AuthWorkspaceShell({ adapter }: AuthWorkspaceShellProps) {
  const [snapshot, setSnapshot] = useState<AuthSessionSnapshot>(() => adapter.getSnapshot());
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAccessToken = useMemo(
    () => () => adapter.getAccessToken(),
    [adapter],
  );
  const workspaceApi = useMemo(
    () => createWorkspaceApi(getAccessToken),
    [getAccessToken],
  );
  const reportApi = useMemo(
    () => createReportApi(getAccessToken),
    [getAccessToken],
  );
  const trustApi = useMemo(
    () => createTrustApi(getAccessToken),
    [getAccessToken],
  );
  const billingApi = useMemo(
    () => createBillingApi(getAccessToken),
    [getAccessToken],
  );

  useEffect(() => adapter.subscribe(setSnapshot), [adapter]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const credentials = { email: email.trim(), password };
      if (mode === 'signin') {
        await adapter.signInWithPassword(credentials);
      } else {
        await adapter.signUpWithPassword(credentials);
      }
      setPassword('');
    } catch (authError) {
      setError(readableError(authError));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    try {
      await adapter.signOut();
    } catch (authError) {
      setError(readableError(authError));
    } finally {
      setBusy(false);
    }
  }

  if (snapshot.status === 'loading') {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">GuardAI Session wird geprüft…</h1>
      </main>
    );
  }

  if (snapshot.status === 'unavailable') {
    return (
      <main className="mx-auto max-w-2xl space-y-3 px-4 py-16">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Auth noch nicht konfiguriert
        </div>
        <h1 className="text-2xl font-semibold">Persistenter Workspace ist vorbereitet, aber noch nicht verbunden</h1>
        <p className="text-sm text-muted-foreground">
          {snapshot.unavailableReason ?? 'Die dedizierte GuardAI-Authentifizierungsumgebung fehlt.'}
        </p>
      </main>
    );
  }

  if (snapshot.status === 'anonymous') {
    return (
      <main className="mx-auto max-w-md space-y-5 px-4 py-16">
        <header className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            GuardAI Account
          </div>
          <h1 className="text-2xl font-semibold">
            {mode === 'signin' ? 'Anmelden' : 'Account erstellen'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Nach der Anmeldung werden Organizations, verifizierte Targets und persistente Scans freigeschaltet.
          </p>
        </header>

        {error && (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {error}
          </div>
        )}

        <form className="space-y-3 rounded-2xl border bg-card p-5" onSubmit={handleAuth}>
          <label className="block space-y-1 text-sm">
            <span>E-Mail</span>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Passwort</span>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={12}
              required
            />
          </label>
          <button
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Bitte warten…' : mode === 'signin' ? 'Anmelden' : 'Account erstellen'}
          </button>
        </form>

        <button
          className="text-sm text-muted-foreground underline underline-offset-4"
          type="button"
          onClick={() => {
            setMode((current) => current === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
        >
          {mode === 'signin' ? 'Noch kein Account? Registrieren' : 'Bereits registriert? Anmelden'}
        </button>
      </main>
    );
  }

  return (
    <div>
      <div className="border-b bg-card/80 px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 text-sm">
          <div>
            <span className="font-medium">GuardAI</span>
            <span className="ml-2 text-muted-foreground">{snapshot.user?.email ?? snapshot.user?.id}</span>
          </div>
          <button
            className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            type="button"
            disabled={busy}
            onClick={handleSignOut}
          >
            Abmelden
          </button>
        </div>
      </div>
      {error && (
        <div className="mx-auto mt-4 max-w-6xl px-4">
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {error}
          </div>
        </div>
      )}
      <WorkspaceOnboarding api={workspaceApi} />
      <ReportCenter reportApi={reportApi} workspaceApi={workspaceApi} />
      <TrustCenterManager reportApi={reportApi} trustApi={trustApi} workspaceApi={workspaceApi} />
      <BillingCenter billingApi={billingApi} workspaceApi={workspaceApi} />
    </div>
  );
}
