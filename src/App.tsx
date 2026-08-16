import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { ScanProgressModal } from './components/ScanProgressModal';
import { ScanResultsDashboard } from './components/ScanResultsDashboard';
import { TechnicalScanReport } from './components/TechnicalScanReport';
import { FeaturePreview } from './components/FeaturePreview';
import { CommandPalette } from './components/CommandPalette';
import { requestComplianceScan, ScanApiError } from './api/scanApi';
import type { ScanResult } from './types/scanner';
import type { ActiveTab } from './types/navigation';
import type { ScanOptions } from './types/scanOptions';

interface PreviewDefinition {
  title: string;
  description: string;
  plannedCapabilities: string[];
}

const PREVIEW_FEATURES: Partial<Record<ActiveTab, PreviewDefinition>> = {
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

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
  const [targetUrl, setTargetUrl] = useState<string | File>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleStartScan = async (target: string | File, options: ScanOptions) => {
    setTargetUrl(target);
    setScanError(null);
    setIsScanning(true);

    try {
      const result = await requestComplianceScan(target, options);
      setScanResult(result);
      setActiveTab('scanner');
    } catch (error) {
      console.error('GuardAI scan failed:', error);
      setScanResult(null);
      setActiveTab('scanner');
      setScanError(
        error instanceof ScanApiError
          ? error.message
          : 'Der Scan konnte nicht abgeschlossen werden.',
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleNewScan = () => {
    setScanResult(null);
    setScanError(null);
    setActiveTab('scanner');
  };

  const preview = PREVIEW_FEATURES[activeTab];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasScanResult={scanResult !== null}
        onNewScan={handleNewScan}
      />

      <CommandPalette onNavigate={setActiveTab} />

      <main style={{ flex: 1 }}>
        {isScanning && (
          <ScanProgressModal
            url={typeof targetUrl === 'string' ? targetUrl : targetUrl.name}
          />
        )}

        {!isScanning && scanError && activeTab === 'scanner' && (
          <div
            role="alert"
            className="max-w-5xl w-[calc(100%-2rem)] mx-auto mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Scan fehlgeschlagen</p>
              <p className="text-sm text-muted-foreground mt-1">{scanError}</p>
              <p className="text-xs text-muted-foreground mt-2">
                GuardAI erzeugt bei einem Backend-Fehler kein Ersatz- oder Demo-Ergebnis.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScanError(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fehlermeldung schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!isScanning && activeTab === 'scanner' && (
          scanResult ? (
            <ScanResultsDashboard
              scanResult={scanResult}
              onOpenBadgeGenerator={() => setActiveTab('badge')}
              onOpenPricing={() => setActiveTab('pricing')}
              onOpenReport={() => setActiveTab('report')}
              onOpenAiCounsel={() => setActiveTab('ai-counsel')}
              onOpenTemplates={() => setActiveTab('templates')}
            />
          ) : (
            <LandingPage onStartScan={handleStartScan} isScanning={isScanning} />
          )
        )}

        {!isScanning && activeTab === 'report' && (
          scanResult ? (
            <TechnicalScanReport scanResult={scanResult} onBack={() => setActiveTab('scanner')} />
          ) : (
            <FeaturePreview
              title="Technical Scan Report"
              description="Ein Report kann erst aus einem vorhandenen realen Scan-Ergebnis erzeugt werden."
              plannedCapabilities={['Evidence-basierte Findings', 'Scanner-/Rule-Versionen', 'druckbarer technischer Report']}
              onBack={() => setActiveTab('scanner')}
            />
          )
        )}

        {!isScanning && preview && (
          <FeaturePreview
            title={preview.title}
            description={preview.description}
            plannedCapabilities={preview.plannedCapabilities}
            onBack={() => setActiveTab('scanner')}
          />
        )}
      </main>

      <footer className="no-print border-t border-border bg-[#09090b] text-zinc-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-black text-sm">G</span>
                </div>
                <span className="font-bold text-zinc-100 text-lg">GuardAI</span>
              </div>
              <p className="text-zinc-500 text-xs leading-relaxed mt-3 max-w-xl">
                Technical compliance evidence & risk screening. Aktiver Produktaufbau — keine offizielle Zertifizierung oder Rechtsberatung.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600">
              <button onClick={() => setActiveTab('scanner')} className="hover:text-zinc-300">Scanner</button>
              <button onClick={() => setActiveTab('report')} className="hover:text-zinc-300">Report</button>
              <button onClick={() => setActiveTab('pricing')} className="hover:text-zinc-300">Pricing Preview</button>
              <span>Prototype</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-800 text-xs text-zinc-600">
            © 2026 GuardAI · Security · Privacy · Accessibility · AI Governance
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
