export interface ScanOptions {
  aiAct: boolean;
  gdpr: boolean;
  wcag: boolean;
  security: boolean;
  fileMode: boolean;
}

export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  aiAct: true,
  gdpr: true,
  wcag: true,
  security: true,
  fileMode: false,
};
