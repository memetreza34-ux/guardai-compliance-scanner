export interface ScanOptions {
  aiAct: boolean;
  gdpr: boolean;
  wcag: boolean;
  security: boolean;
  fileMode: boolean;
}

export type SelectableWebScanOption = 'aiAct' | 'gdpr' | 'security';

export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  aiAct: true,
  gdpr: true,
  wcag: false,
  security: true,
  fileMode: false,
};

export const FILE_SCAN_OPTIONS: ScanOptions = {
  aiAct: false,
  gdpr: false,
  wcag: false,
  security: false,
  fileMode: true,
};
