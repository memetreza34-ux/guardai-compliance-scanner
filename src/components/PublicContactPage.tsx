import { useEffect, useRef, useState, type FormEvent } from 'react';
import { GuardApiError } from '../api/apiClient';
import {
  createLeadIdempotencyKey,
  getLeadCaptureConfig,
  submitPublicLead,
} from '../api/leadApi';
import type { PublicLeadCaptureConfig } from '../types/lead';

function readableError(error: unknown): string {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'Kontaktanfrage konnte nicht gesendet werden.';
}

export default function PublicContactPage() {
  const [config, setConfig] = useState<PublicLeadCaptureConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const requestKeyRef = useRef(createLeadIdempotencyKey());

  useEffect(() => {
    let cancelled = false;
    getLeadCaptureConfig()
      .then((next) => {
        if (!cancelled) setConfig(next);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(readableError(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config?.enabled) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const result = await submitPublicLead(
        {
          email,
          name: name || undefined,
          company: company || undefined,
          message: message || undefined,
          website,
          marketingOptIn: false,
        },
        requestKeyRef.current,
      );
      if (result.accepted) {
        setAccepted(true);
        setEmail('');
        setName('');
        setCompany('');
        setMessage('');
        setWebsite('');
        requestKeyRef.current = createLeadIdempotencyKey();
      }
    } catch (error) {
      setSubmitError(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">GuardAI Kontakt</div>
        <h1 className="text-3xl font-semibold">Kontaktformular nicht verfügbar</h1>
        <p className="text-sm text-muted-foreground">
          Die öffentliche Kontaktfunktion kann derzeit nicht sicher geladen werden. Es werden über diese Seite keine Kontaktdaten erfasst.
        </p>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-sm text-muted-foreground">Kontakt-Konfiguration wird geprüft…</p>
      </main>
    );
  }

  if (!config.enabled || !config.privacyNoticeUrl || !config.privacyNoticeVersion) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">GuardAI Kontakt</div>
        <h1 className="text-3xl font-semibold">Kontaktformular noch nicht aktiviert</h1>
        <p className="text-sm text-muted-foreground">
          GuardAI erfasst über dieses Formular erst dann Kontaktdaten, wenn die dafür vorgesehene Datenschutz- und Aufbewahrungskonfiguration freigegeben ist.
        </p>
      </main>
    );
  }

  if (accepted) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">GuardAI Kontakt</div>
        <h1 className="text-3xl font-semibold">Anfrage angenommen</h1>
        <p className="text-sm text-muted-foreground">
          Die Kontaktanfrage wurde angenommen. Diese Bestätigung bedeutet nicht, dass bereits eine E-Mail versendet oder eine Bearbeitungsfrist zugesagt wurde.
        </p>
        <button
          className="rounded-lg border px-4 py-2 text-sm font-medium"
          type="button"
          onClick={() => setAccepted(false)}
        >
          Neue Anfrage
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-12">
      <header className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">GuardAI Kontakt</div>
        <h1 className="text-3xl font-semibold tracking-tight">Kontaktanfrage</h1>
        <p className="text-sm text-muted-foreground">
          Nutze dieses Formular für eine direkte Kontaktanfrage. Eine Marketing-Einwilligung ist derzeit nicht Bestandteil dieses Formulars.
        </p>
      </header>

      {submitError && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {submitError}
        </div>
      )}

      <form className="space-y-4 rounded-2xl border bg-card p-5" onSubmit={handleSubmit}>
        <label className="block space-y-1 text-sm">
          <span>E-Mail *</span>
          <input
            className="w-full rounded-lg border bg-background px-3 py-2"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={320}
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span>Name</span>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Unternehmen</span>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2"
              autoComplete="organization"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              maxLength={160}
            />
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span>Nachricht</span>
          <textarea
            className="min-h-32 w-full rounded-lg border bg-background px-3 py-2"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={2000}
          />
        </label>

        <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </label>
        </div>

        <p className="text-xs text-muted-foreground">
          Mit dem Absenden werden die Angaben zur Bearbeitung dieser Kontaktanfrage verarbeitet. Datenschutzinformation: {' '}
          <a
            className="underline underline-offset-4"
            href={config.privacyNoticeUrl}
            rel="noreferrer"
          >
            Version {config.privacyNoticeVersion}
          </a>.
        </p>

        <button
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          type="submit"
          disabled={busy}
        >
          {busy ? 'Wird gesendet…' : 'Kontaktanfrage senden'}
        </button>
      </form>
    </main>
  );
}
