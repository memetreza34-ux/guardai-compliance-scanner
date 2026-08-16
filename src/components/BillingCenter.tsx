import { useEffect, useMemo, useState } from 'react';
import { GuardApiError } from '../api/apiClient';
import type { BillingApi } from '../api/billingApi';
import type { WorkspaceApi } from '../api/workspaceApi';
import type { BillingStatus } from '../types/billing';
import type { WorkspaceOrganization } from '../types/workspace';

interface BillingCenterProps {
  billingApi: BillingApi;
  workspaceApi: WorkspaceApi;
}

function readableError(error: unknown): string {
  if (error instanceof GuardApiError) return `${error.message} (${error.code})`;
  return error instanceof Error ? error.message : 'Billing-Aktion fehlgeschlagen.';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('de-DE');
}

function isBillingAdmin(role: WorkspaceOrganization['role']): boolean {
  return role === 'owner' || role === 'admin';
}

export default function BillingCenter({ billingApi, workspaceApi }: BillingCenterProps) {
  const [organizations, setOrganizations] = useState<WorkspaceOrganization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
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
        const billingOrganizations = next.filter((organization) => isBillingAdmin(organization.role));
        setOrganizations(billingOrganizations);
        setOrganizationId(billingOrganizations[0]?.id ?? '');
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
    setSelectedPlan('');
    if (!organizationId) {
      setStatus(null);
      return undefined;
    }
    billingApi.getStatus(organizationId)
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch((loadError) => {
        if (!cancelled) setError(readableError(loadError));
      });
    return () => {
      cancelled = true;
    };
  }, [billingApi, organizationId]);

  async function refreshStatus() {
    if (!organizationId) return;
    setStatus(await billingApi.getStatus(organizationId));
  }

  async function startCheckout() {
    if (!organizationId || !selectedPlan) return;
    setBusy(true);
    setError(null);
    try {
      const checkout = await billingApi.createCheckout(organizationId, selectedPlan);
      window.location.assign(checkout.url);
    } catch (checkoutError) {
      setError(readableError(checkoutError));
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
      <header className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Billing & Entitlements
        </div>
        <h2 className="text-2xl font-semibold">Workspace-Billing</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Der Browser kennt nur GuardAI-Plan-Codes. Preise und Stripe-Price-IDs werden ausschließlich serverseitig konfiguriert. Ein Checkout-Redirect aktiviert keine Berechtigung; maßgeblich ist der per signiertem Webhook bestätigte Subscription-State.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      )}

      {organizations.length === 0 ? (
        <div className="rounded-2xl border p-5 text-sm text-muted-foreground">
          Billing ist nur für Owner/Admin eines Workspaces sichtbar.
        </div>
      ) : (
        <div className="space-y-5 rounded-2xl border bg-card p-5">
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

          {status && selectedOrganization && (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Plan</div>
                  <div className="font-semibold">{status.plan}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="font-semibold">{status.status}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Periode</div>
                  <div className="font-semibold">{formatDate(status.periodEnd)}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Provider</div>
                  <div className="font-semibold">{status.provider}</div>
                </div>
              </div>

              {status.cancelAtPeriodEnd && (
                <div className="rounded-xl border p-3 text-sm">
                  Die aktuelle Subscription ist beim Provider zur Beendigung am Periodenende markiert.
                </div>
              )}

              {!status.billingEnabled ? (
                <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                  Stripe Billing ist in dieser GuardAI-Umgebung noch nicht aktiviert. Es werden keine Testpreise oder Checkout-Simulationen angezeigt.
                </div>
              ) : status.availablePlans.length === 0 ? (
                <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                  Billing ist aktiviert, aber es sind noch keine freigegebenen GuardAI-Paid-Pläne konfiguriert.
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block max-w-xl space-y-1 text-sm">
                    <span>Konfigurierter Paid-Plan</span>
                    <select
                      className="w-full rounded-lg border bg-background px-3 py-2"
                      value={selectedPlan}
                      onChange={(event) => setSelectedPlan(event.target.value)}
                      disabled={busy}
                    >
                      <option value="">Plan auswählen…</option>
                      {status.availablePlans.map((plan) => (
                        <option key={plan} value={plan}>{plan}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    type="button"
                    disabled={busy || !selectedPlan}
                    onClick={startCheckout}
                  >
                    {busy ? 'Checkout wird erstellt…' : 'Zu Stripe Checkout'}
                  </button>
                </div>
              )}

              <button
                className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  refreshStatus()
                    .catch((refreshError) => setError(readableError(refreshError)))
                    .finally(() => setBusy(false));
                }}
              >
                Billing-Status aktualisieren
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
