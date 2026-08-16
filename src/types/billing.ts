export interface BillingStatus {
  provider: string;
  plan: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
  billingEnabled: boolean;
  availablePlans: string[];
}

export interface BillingCheckout {
  sessionId: string;
  url: string;
}
