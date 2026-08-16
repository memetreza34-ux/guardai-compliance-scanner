import type { ActiveTab } from '../types/navigation';

export interface PreviewDefinition {
  title: string;
  description: string;
  plannedCapabilities: string[];
}

export const PREVIEW_FEATURES: Partial<Record<ActiveTab, PreviewDefinition>> = {
  dashboard: {
    title: 'Workspace Dashboard',
    description: 'Das vorhandene Dashboard-Design enthält derzeit noch statische Benutzer-, Domain- und Aktivitätsdaten und ist deshalb aus dem produktiven Runtime-Pfad genommen.',
    plannedCapabilities: [
      'echte Workspaces, Targets und Scan-Historie',
      'serverseitige Rollen und Tenant-Isolation',
      'reale Risiko- und Monitoring-Kennzahlen',
    ],
  },
  'audit-hub': {
    title: 'Audit Hub',
    description: 'Der bisherige Audit Hub ist ein Enterprise-Produktprototyp. Er wird erst nach dem stabilen Scanner-Core datenbankgestützt aufgebaut.',
    plannedCapabilities: [
      'versionierte Controls und Evidence-Verknüpfung',
      'echte Control-Coverage statt statischer Prozentwerte',
      'Audit-Trail und Review-Workflow',
    ],
  },
  badge: {
    title: 'Trust Badge',
    description: 'Das Badge darf erst öffentlich werden, wenn es auf einen echten, kundenkontrollierten und serverseitig verifizierbaren Trust-Center-Status verweist.',
    plannedCapabilities: [
      'Badge aus realer publizierter Evidence',
      'kein automatisches „compliant“ oder „verified“ ohne Grundlage',
      'sofortige Deaktivierung durch den Workspace',
    ],
  },
  pricing: {
    title: 'Pricing & Billing',
    description: 'Der bisherige Checkout ist simuliert. GuardAI zeigt deshalb aktuell keinen lokalen Upgrade-Flow als echte Zahlung an.',
    plannedCapabilities: [
      'echter Payment Provider',
      'signierte Webhooks und serverseitige Entitlements',
      'Upgrade, Downgrade, Kündigung und Failed-Payment-Handling',
    ],
  },
  'ai-counsel': {
    title: 'AI Counsel',
    description: 'Die vorhandene AI-Counsel-Oberfläche nutzt noch keine belastbare Workspace-Evidence und darf daher keine simulierten Rechtsfindings als Analyse ausgeben.',
    plannedCapabilities: [
      'Antworten aus realer Scan-Evidence und Workspace-Kontext',
      'klare Trennung von technischen Fakten und AI-Erklärung',
      'strukturierte Outputs, Evals und Prompt-Injection-Schutz',
    ],
  },
  'trust-center': {
    title: 'Public Trust Center',
    description: 'Der bisherige Trust-Center-Prototyp zeigt statische Compliance-Zustände. Er bleibt deaktiviert, bis öffentliche Daten aus echter Evidence stammen.',
    plannedCapabilities: [
      'kundenseitig auswählbare veröffentlichte Felder',
      'aktuelle Scan- und Coverage-Daten',
      'keine erfundenen Zertifikate oder Rechtsgarantien',
    ],
  },
  'legal-docs': {
    title: 'Smart Docs',
    description: 'Dokumentgenerierung wird erst produktiv, wenn Inhalte versioniert, evidenzbezogen und fachlich sauber eingeordnet werden können.',
    plannedCapabilities: [
      'versionierte Templates',
      'Workspace-/Evidence-Kontext',
      'klare Grenzen gegenüber Rechtsberatung und Rechtsgültigkeitsgarantien',
    ],
  },
  templates: {
    title: 'Templates Hub',
    description: 'Die vorhandenen Textbausteine müssen vor öffentlicher Nutzung an eine versionierte Legal-Source-Registry und Review-Prozesse angebunden werden.',
    plannedCapabilities: [
      'Quellen- und Versionsbezug',
      'Jurisdiktion und Gültigkeitsstand',
      'Review- und Änderungsverlauf',
    ],
  },
  integrations: {
    title: 'Integrations Hub',
    description: 'Aktuelle Connection-Toggles sind nur Designzustände. Eine Verbindung gilt künftig nur als aktiv, wenn das Backend sie wirklich authentifiziert und gespeichert hat.',
    plannedCapabilities: [
      'GitHub als erste echte Integration',
      'OAuth/Token-Sicherheit und Scopes',
      'Sync-Status, Fehlerzustände und Revocation',
    ],
  },
  policy: {
    title: 'Policy Engine',
    description: 'Die Policy-Oberfläche bleibt Post-MVP, bis Rules, Evidence und Controls als echte versionierte Datenmodelle existieren.',
    plannedCapabilities: [
      'versionierte technische Regeln',
      'Control-/Evidence-Mapping',
      'nachvollziehbare Policy-Auswertung',
    ],
  },
  truesight: {
    title: 'TrueSight Labs',
    description: 'Die bisherige TrueSight-Klassifikation war simuliert. Das Feature bleibt Labs, bis echte Modelle und belastbare Evaluationen vorliegen.',
    plannedCapabilities: [
      'reale Modell-Inferenz',
      'kalibrierte Confidence',
      'Benchmark-/Eval-Datensatz und dokumentierte Fehlerraten',
    ],
  },
};
