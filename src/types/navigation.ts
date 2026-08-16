export const ACTIVE_TABS = [
  'scanner',
  'badge',
  'pricing',
  'report',
  'dashboard',
  'ai-counsel',
  'trust-center',
  'legal-docs',
  'audit-hub',
  'templates',
  'integrations',
  'policy',
  'truesight',
] as const;

export type ActiveTab = (typeof ACTIVE_TABS)[number];

export function isActiveTab(value: string): value is ActiveTab {
  return (ACTIVE_TABS as readonly string[]).includes(value);
}
