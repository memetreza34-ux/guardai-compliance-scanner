export default function BillingReturnPage() {
  const outcome = new URLSearchParams(window.location.search).get('checkout');
  const cancelled = outcome === 'cancelled';

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-16">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        GuardAI Billing
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">
        {cancelled ? 'Checkout beendet' : 'Checkout-Rückkehr empfangen'}
      </h1>
      <p className="text-sm text-muted-foreground">
        {cancelled
          ? 'Es wurde hier keine GuardAI-Berechtigung aktiviert. Du kannst zum Workspace zurückkehren und den aktuellen Billing-State prüfen.'
          : 'Diese Rückkehrseite ist kein Zahlungsnachweis. GuardAI aktiviert Paid-Berechtigungen ausschließlich aus dem serverseitig reconcilierten Subscription-State nach verifiziertem Stripe-Webhook.'}
      </p>
      <a
        className="inline-flex rounded-lg border px-4 py-2 text-sm font-medium"
        href="/"
      >
        Zur GuardAI-App
      </a>
    </main>
  );
}
