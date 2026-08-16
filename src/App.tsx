import { useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { ScanProgressModal } from './components/ScanProgressModal';
import { ScanResultsDashboard } from './components/ScanResultsDashboard';
import { TechnicalScanReport } from './components/TechnicalScanReport';
import { FeaturePreview } from './components/FeaturePreview';
import { CommandPalette } from './components/CommandPalette';
import { requestComplianceScan, ScanApiError } from './api/scanApi';
import { PREVIEW_FEATURES } from './config/previewFeatures';
import type { ScanResult } from './types/scanner';
import type { ActiveTab } from './types/navigation';
import type { ScanOptions } from './types/scanOptions';

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

        {!isScanning && activeTab === 'scanner' && scanResult?.notices && scanResult.notices.length > 0 && (
          <section className="max-w-5xl w-[calc(100%-2rem)] mx-auto mt-6 rounded-xl border border-sky-500/25 bg-sky-500/10 p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Coverage-Hinweise</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc pl-5">
                  {scanResult.notices.map((notice) => (
                    <li key={notice}>{notice}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
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
