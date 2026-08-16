import { useEffect, useState } from 'react';
import { GuardApiError } from '../api/apiClient';
import type { EvidenceApi } from '../api/evidenceApi';
import type { EvidenceExplorerItem } from '../types/evidenceExplorer';

interface EvidenceExplorerProps {
  api: EvidenceApi;
  organizationId: string;
}

function readableError(error: unknown): string {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  if (error instanceof Error) return error.message;
  return 'Unbekannter Fehler.';
}

function renderNormalizedValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '—';
  return JSON.stringify(value, null, 2);
}

export default function EvidenceExplorer({ api, organizationId }: EvidenceExplorerProps) {
  const [detectorId, setDetectorId] = useState('');
  const [type, setType] = useState('');
  const [items, setItems] = useState<EvidenceExplorerItem[]>([]);
  const [selected, setSelected] = useState<EvidenceExplorerItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const page = await api.listEvidence(organizationId, {
        detectorId: detectorId || undefined,
        type: type || undefined,
        limit: 100,
      });
      setItems(page.evidence);
      if (selected && !page.evidence.some((item) => item.id === selected.id)) {
        setSelected(null);
      }
    } catch (loadError) {
      setError(readableError(loadError));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    api.listEvidence(organizationId, { limit: 100 })
      .then((page) => {
        if (!cancelled) setItems(page.evidence);
      })
      .catch((loadError) => {
        if (!cancelled) setError(readableError(loadError));
      });

    return () => {
      cancelled = true;
    };
  }, [api, organizationId]);

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <header className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Evidence Explorer
        </div>
        <h2 className="text-xl font-semibold">Gespeicherte technische Evidence</h2>
        <p className="text-sm text-muted-foreground">
          Angezeigt werden ausschließlich normalisierte, persistierte Scanner-Beobachtungen. Nicht gespeicherte Rohdaten werden nicht rekonstruiert.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={detectorId}
          onChange={(event) => setDetectorId(event.target.value)}
          placeholder="Detector, z. B. security.headers"
          maxLength={120}
        />
        <input
          className="rounded-lg border bg-background px-3 py-2 text-sm"
          value={type}
          onChange={(event) => setType(event.target.value)}
          placeholder="Evidence-Typ"
          maxLength={120}
        />
        <button
          className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
          type="button"
          disabled={busy}
          onClick={load}
        >
          {busy ? 'Lädt…' : 'Filtern'}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-2">
          {items.length === 0 && (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Keine Evidence für diesen Filter vorhanden.
            </div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              className="block w-full rounded-xl border p-3 text-left text-sm hover:bg-muted/60"
              type="button"
              onClick={() => setSelected(item)}
            >
              <div className="font-medium">{item.detectorId} · {item.detectorVersion}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.type}</div>
              <div className="mt-1 break-all text-xs text-muted-foreground">{item.targetDisplayName} · {item.source}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {new Date(item.capturedAt).toLocaleString('de-DE')}
              </div>
            </button>
          ))}
        </div>

        <div className="min-w-0 rounded-xl border p-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">Wähle einen Evidence-Eintrag aus.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selected.detectorId}</h3>
                <p className="text-xs text-muted-foreground">
                  Version {selected.detectorVersion} · Hash {selected.contentHash ?? '—'}
                </p>
              </div>

              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Target</dt>
                  <dd>{selected.targetDisplayName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Typ</dt>
                  <dd>{selected.type}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Quelle</dt>
                  <dd className="break-all">{selected.source}</dd>
                </div>
              </dl>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Normalisierte Daten
                </div>
                <div className="space-y-2">
                  {Object.entries(selected.normalizedData).map(([key, value]) => (
                    <div key={key} className="rounded-lg bg-muted p-3 text-xs">
                      <div className="mb-1 font-medium">{key}</div>
                      <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono">
                        {renderNormalizedValue(value)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
