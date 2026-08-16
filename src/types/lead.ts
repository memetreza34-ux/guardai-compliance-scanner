export interface PublicLeadCaptureConfig {
  enabled: boolean;
  privacyNoticeVersion: string | null;
  privacyNoticeUrl: string | null;
  marketingOptInAvailable: boolean;
}

export interface PublicLeadSubmission {
  email: string;
  name?: string;
  company?: string;
  message?: string;
  marketingOptIn?: boolean;
  website?: string;
}

export interface PublicLeadReceipt {
  accepted: boolean;
  idempotentReplay: boolean;
  marketingConfirmationRequired: boolean;
}
