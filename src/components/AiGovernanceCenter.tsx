import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { GuardApiError } from '../api/apiClient';
import type { AiGovernanceApi } from '../api/aiGovernanceApi';
import type { WorkspaceApi } from '../api/workspaceApi';
import {
  canEditAiGovernance,
  canReviewAiGovernance,
  type AiGovernanceDeclarations,
  type AiGovernanceReview,
  type AiGovernanceTriState,
  type AiGovernanceUseCase,
  type AiSystemDeclarationInput,
  type AiSystemProfile,
} from '../types/aiGovernance';
import type { WorkspaceOrganization } from '../types/workspace';

interface AiGovernanceCenterProps {
  aiGovernanceApi: AiGovernanceApi;
  workspaceApi: WorkspaceApi;
}

const DEFAULT_DECLARATIONS: AiGovernanceDeclarations = {
  interactsDirectlyWithPeople: 'unknown',
  generatesSyntheticContent: 'unknown',
  aiLiteracyMeasuresDocumented: 'unknown',
  humanOversightControlsDocumented: 'unknown',
  interactionDisclosureDocumented: 'unknown',
  syntheticContentDisclosureDocumented: 'unknown',
};

const USE_CASES: Array<{ id: AiGovernanceUseCase; label: string }> = [
  { id: 'content-generation', label: 'Content-Generierung' },
  { id: 'human-interaction', label: 'Direkte Interaktion mit Menschen' },
  { id: 'decision-support', label: 'Entscheidungsunterstützung' },
  { id: 'automated-action', label: 'Automatisierte Aktion' },
  { id: 'biometric-or-emotion', label: 'Biometrie / Emotion' },
  { id: 'other', label: 'Sonstiger Einsatz' },
];

const DECLARATION_FIELDS: Array<{
  key: keyof AiGovernanceDeclarations;
  label: string;
}> = [
  { key: 'interactsDirectlyWithPeople', label: 'Interagiert das System direkt mit Menschen?' },
  { key: 'generatesSyntheticContent', label: 'Erzeugt das System synthetische Inhalte?' },
  { key: 'aiLiteracyMeasuresDocumented', label: 'Sind Maßnahmen zur KI-Kompetenz dokumentiert?' },
  { key: 'humanOversightControlsDocumented', label: 'Sind menschliche Aufsichts-/Kontrollmaßnahmen dokumentiert?' },
  { key: 'interactionDisclosureDocumented', label: 'Ist eine Offenlegung der KI-Interaktion dokumentiert?' },
  { key: 'syntheticContentDisclosureDocumented', label: 'Ist eine Offenlegung synthetischer Inhalte dokumentiert?' },
];

function readableError(error: unknown): string {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'AI-Governance-Aktion fehlgeschlagen.';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('de-DE');
}

function documentationLabel(value: string): string {
  if (value === 'documented_by_declaration') return 'Als dokumentiert angegeben';
  if (value === 'not_documented_by_declaration') return 'Als nicht dokumentiert angegeben';
  return 'Unklar / nicht angegeben';
}

function triStateLabel(value: AiGovernanceTriState): string {
  if (value === 'yes') return 'Ja';
  if (value === 'no') return 'Nein';
  return 'Unklar';
}

export default function AiGovernanceCenter({ aiGovernanceApi, workspaceApi }: AiGovernanceCenterProps) {
  const [organizations, setOrganizations] = useState<WorkspaceOrganization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [systems, setSystems] = useState<AiSystemProfile[]>([]);
  const [reviews, setReviews] = useState<AiGovernanceReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<AiGovernanceReview | null>(null);
  const [systemName, setSystemName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [modelName, setModelName] = useState('');
  const [organizationRole, setOrganizationRole] = useState<AiSystemDeclarationInput['organizationRole']>('unknown');
  const [deploymentContext, setDeploymentContext] = useState<AiSystemDeclarationInput['deploymentContext']>('unknown');
  const [useCases, setUseCases] = useState<AiGovernanceUseCase[]>([]);
  const [declarations, setDeclarations] = useState<AiGovernanceDeclarations>(DEFAULT_DECLARATIONS);
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
    setSelectedReview(null);
    if (!organizationId) {
      setSystems([]);
      setReviews([]);
      return undefined;
    }

    Promise.all([
      aiGovernanceApi.listSystems(organizationId),
      aiGovernanceApi.listReviews(organizationId),
    ])
      .then(([nextSystems, nextReviews]) => {
        if (cancelled) return;
        setSystems(nextSystems);
        setReviews(nextReviews);
      })
      .catch((loadError) => {
        if (!cancelled) setError(readableError(loadError));
      });

    return () => {
      cancelled = true;
    };
  }, [aiGovernanceApi, organizationId]);

  async function refresh() {
    if (!organizationId) return;
    const [nextSystems, nextReviews] = await Promise.all([
      aiGovernanceApi.listSystems(organizationId),
      aiGovernanceApi.listReviews(organizationId),
    ]);
    setSystems(nextSystems);
    setReviews(nextReviews);
  }

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

  function toggleUseCase(useCase: AiGovernanceUseCase) {
    setUseCases((current) => current.includes(useCase)
      ? current.filter((entry) => entry !== useCase)
      : [...current, useCase]);
  }

  function resetForm() {
    setSystemName('');
    setProviderName('');
    setModelName('');
    setOrganizationRole('unknown');
    setDeploymentContext('unknown');
    setUseCases([]);
    setDeclarations(DEFAULT_DECLARATIONS);
  }

  async function handleCreateSystem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    await runAction(async () => {
      await aiGovernanceApi.createSystem(organizationId, {
        systemName,
        organizationRole,
        providerName: providerName.trim() || null,
        modelName: modelName.trim() || null,
        deploymentContext,
        useCases,
        declarations,
      });
      resetForm();
      await refresh();
    });
  }

  async function createReview(system: AiSystemProfile) {
    await runAction(async () => {
      const created = await aiGovernanceApi.createReview(organizationId, system.id);
      const detailed = await aiGovernanceApi.getReview(organizationId, created.id);
      setSelectedReview(detailed);
      await refresh();
    });
  }

  async function loadReview(review: AiGovernanceReview) {
    await runAction(async () => {
      setSelectedReview(await aiGovernanceApi.getReview(organizationId, review.id));
    });
  }

  async function transitionReview(review: AiGovernanceReview, action: 'submit' | 'review' | 'reopen') {
    await runAction(async () => {
      await aiGovernanceApi.transitionReview(organizationId, review.id, action);
      setSelectedReview(await aiGovernanceApi.getReview(organizationId, review.id));
      await refresh();
    });
  }

  async function archiveSystem(system: AiSystemProfile) {
    await runAction(async () => {
      await aiGovernanceApi.archiveSystem(organizationId, system.id);
      if (selectedReview?.aiSystemId === system.id) setSelectedReview(null);
      await refresh();
    });
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          AI Governance Guided Review
        </div>
        <h2 className="text-2xl font-semibold">Strukturierte AI-System-Evidenz & menschliche Prüfung</h2>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Dieser Workflow dokumentiert Angaben zum AI-System und verknüpft Review-Punkte mit versionierten Quellen. GuardAI entscheidet hier weder die rechtliche Anwendbarkeit noch eine EU-AI-Act-Konformität und vergibt bewusst keinen Compliance-Score.
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

      {selectedOrganization && canEditAiGovernance(selectedOrganization.role) && (
        <form className="space-y-5 rounded-2xl border bg-card p-5" onSubmit={handleCreateSystem}>
          <div>
            <h3 className="font-semibold">AI-System deklarieren</h3>
            <p className="text-sm text-muted-foreground">
              Nur strukturierte Metadaten. Keine Prompts, Modelloutputs, Kundentexte oder freie Rechtsbewertung eingeben.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span>Systemname</span>
              <input className="w-full rounded-lg border bg-background px-3 py-2" value={systemName} onChange={(event) => setSystemName(event.target.value)} maxLength={160} required />
            </label>
            <label className="space-y-1 text-sm">
              <span>Provider (optional)</span>
              <input className="w-full rounded-lg border bg-background px-3 py-2" value={providerName} onChange={(event) => setProviderName(event.target.value)} maxLength={160} />
            </label>
            <label className="space-y-1 text-sm">
              <span>Modell (optional)</span>
              <input className="w-full rounded-lg border bg-background px-3 py-2" value={modelName} onChange={(event) => setModelName(event.target.value)} maxLength={160} />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Rolle der Organisation</span>
              <select className="w-full rounded-lg border bg-background px-3 py-2" value={organizationRole} onChange={(event) => setOrganizationRole(event.target.value as AiSystemDeclarationInput['organizationRole'])}>
                <option value="unknown">Unklar</option>
                <option value="provider">Provider</option>
                <option value="deployer">Deployer</option>
                <option value="both">Beides</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Einsatzkontext</span>
              <select className="w-full rounded-lg border bg-background px-3 py-2" value={deploymentContext} onChange={(event) => setDeploymentContext(event.target.value as AiSystemDeclarationInput['deploymentContext'])}>
                <option value="unknown">Unklar</option>
                <option value="internal">Intern</option>
                <option value="customer-facing">Kundenkontakt</option>
                <option value="embedded">Eingebettet</option>
                <option value="other">Sonstiger</option>
              </select>
            </label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Einsatzarten</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {USE_CASES.map((useCase) => (
                <label key={useCase.id} className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                  <input type="checkbox" checked={useCases.includes(useCase.id)} onChange={() => toggleUseCase(useCase.id)} />
                  <span>{useCase.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Strukturierte Angaben</legend>
            {DECLARATION_FIELDS.map((field) => (
              <label key={field.key} className="grid gap-2 rounded-lg border p-3 text-sm md:grid-cols-[1fr_180px] md:items-center">
                <span>{field.label}</span>
                <select
                  className="rounded-lg border bg-background px-3 py-2"
                  value={declarations[field.key]}
                  onChange={(event) => setDeclarations((current) => ({
                    ...current,
                    [field.key]: event.target.value as AiGovernanceTriState,
                  }))}
                >
                  <option value="unknown">Unklar</option>
                  <option value="yes">Ja</option>
                  <option value="no">Nein</option>
                </select>
              </label>
            ))}
          </fieldset>

          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50" type="submit" disabled={busy}>
            {busy ? 'Bitte warten…' : 'AI-System speichern'}
          </button>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border bg-card p-5">
          <div>
            <h3 className="font-semibold">AI-Systeme</h3>
            <p className="text-sm text-muted-foreground">Aktive strukturierte Deklarationen im Workspace.</p>
          </div>
          {systems.length === 0 && <p className="text-sm text-muted-foreground">Noch kein AI-System erfasst.</p>}
          {systems.map((system) => (
            <article key={system.id} className="space-y-3 rounded-xl border p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{system.systemName}</div>
                  <div className="text-xs text-muted-foreground">
                    {system.organizationRole} · {system.deploymentContext}
                  </div>
                </div>
                <span className="rounded-full border px-2 py-1 text-xs">Kein Rechtsstatus</span>
              </div>
              <div className="grid gap-1 text-xs text-muted-foreground">
                <span>Provider: {system.providerName ?? '—'}</span>
                <span>Modell: {system.modelName ?? '—'}</span>
                <span>Einsatzarten: {system.useCases.length > 0 ? system.useCases.join(', ') : '—'}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {canEditAiGovernance(selectedOrganization?.role) && (
                  <button className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50" type="button" disabled={busy} onClick={() => createReview(system)}>
                    Guided Review erzeugen
                  </button>
                )}
                {canReviewAiGovernance(selectedOrganization?.role) && (
                  <button className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50" type="button" disabled={busy} onClick={() => archiveSystem(system)}>
                    Archivieren
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border bg-card p-5">
          <div>
            <h3 className="font-semibold">Guided Reviews</h3>
            <p className="text-sm text-muted-foreground">Jeder Review friert die damalige Systemdeklaration und Quellen-Version ein.</p>
          </div>
          {reviews.length === 0 && <p className="text-sm text-muted-foreground">Noch kein Review vorhanden.</p>}
          {reviews.map((review) => (
            <article key={review.id} className="space-y-2 rounded-xl border p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{review.status}</span>
                <span className="rounded-full border px-2 py-1 text-xs">Menschliche Prüfung erforderlich</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Registry: {review.sourceRegistryId}@{review.sourceRegistryVersion} · erstellt {formatDate(review.createdAt)}
              </div>
              <button className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50" type="button" disabled={busy} onClick={() => loadReview(review)}>
                Review öffnen
              </button>
            </article>
          ))}
        </div>
      </div>

      {selectedReview && (
        <div className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">Review-Details</h3>
              <p className="text-sm text-muted-foreground">
                Status: {selectedReview.status} · kein automatischer Rechtsentscheid · kein Compliance-Score
              </p>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs">requires_human_review</span>
          </div>

          {selectedReview.items?.map((item) => (
            <article key={item.itemKey} className="space-y-2 rounded-xl border p-4 text-sm">
              <div className="font-medium">{item.itemKey}</div>
              <div className="grid gap-1 text-xs text-muted-foreground">
                <span>Dokumentationsstatus: {documentationLabel(item.documentationState)}</span>
                <span>Anwendbarkeit: menschlich zu prüfen</span>
                <span>Trigger: {item.trigger}</span>
              </div>
              {item.legalSource && (
                <div className="text-xs">
                  <span className="font-medium">Quelle: </span>
                  {item.legalSource.sourceUrl ? (
                    <a className="underline underline-offset-4" href={item.legalSource.sourceUrl} target="_blank" rel="noreferrer">
                      {item.legalSource.reference}
                    </a>
                  ) : item.legalSource.reference}
                </div>
              )}
            </article>
          ))}

          <div className="rounded-xl bg-muted p-4 text-xs text-muted-foreground">
            Snapshot: {selectedReview.systemSnapshot.systemName} · Rolle {selectedReview.systemSnapshot.organizationRole} · Einsatz {selectedReview.systemSnapshot.deploymentContext}. Die damalige Deklaration bleibt für diesen Review unverändert erhalten.
          </div>

          <div className="flex flex-wrap gap-2">
            {canEditAiGovernance(selectedOrganization?.role) && ['draft', 'reopened'].includes(selectedReview.status) && (
              <button className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50" type="button" disabled={busy} onClick={() => transitionReview(selectedReview, 'submit')}>
                Zur menschlichen Prüfung einreichen
              </button>
            )}
            {canReviewAiGovernance(selectedOrganization?.role) && selectedReview.status === 'submitted' && (
              <button className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50" type="button" disabled={busy} onClick={() => transitionReview(selectedReview, 'review')}>
                Als geprüft markieren
              </button>
            )}
            {canReviewAiGovernance(selectedOrganization?.role) && selectedReview.status === 'reviewed' && (
              <button className="rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50" type="button" disabled={busy} onClick={() => transitionReview(selectedReview, 'reopen')}>
                Review wieder öffnen
              </button>
            )}
          </div>

          <div className="grid gap-1 text-xs text-muted-foreground">
            <span>Eingereicht: {formatDate(selectedReview.submittedAt)}</span>
            <span>Geprüft: {formatDate(selectedReview.reviewedAt)}</span>
            {Object.entries(selectedReview.systemSnapshot.declarations).map(([key, value]) => (
              <span key={key}>{key}: {triStateLabel(value)}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
