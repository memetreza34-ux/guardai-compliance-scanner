import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { ScanProgressModal } from './components/ScanProgressModal';
import { ComplianceDashboard } from './components/ComplianceDashboard';
import { BadgeGenerator } from './components/BadgeGenerator';
import { PricingModal } from './components/PricingModal';
import { PrintableReport } from './components/PrintableReport';
import { UserDashboard } from './components/UserDashboard';
import { LeadGenModal } from './components/LeadGenModal';
import { AiCounsel } from './components/AiCounsel';
import { PublicTrustCenter } from './components/PublicTrustCenter';
import { DocumentGenerator } from './components/DocumentGenerator';
import { CommandPalette } from './components/CommandPalette';
import { AuditHub } from './components/AuditHub';
import { TemplatesHub } from './components/TemplatesHub';
import { IntegrationsHub } from './components/IntegrationsHub';
import { PolicyManager } from './components/PolicyManager';
import { TrueSight } from './components/TrueSight';
import { requestComplianceScan, ScanApiError } from './api/scanApi';
import type { ScanResult } from './types/scanner';
import type { ActiveTab } from './types/navigation';
import type { ScanOptions } from './types/scanOptions';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
  const [targetUrl, setTargetUrl] = useState<string | File>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showLeadGen, setShowLeadGen] = useState(false);

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

  const handlePrototypeUpgrade = () => {
    setIsPremium(true);
    setActiveTab('scanner');
  };

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

        <div className="flex-1 w-full flex flex-col p-4 md:p-8 overflow-y-auto">
          {!isScanning && scanError && activeTab === 'scanner' && (
            <div
              role="alert"
              className="max-w-5xl w-full mx-auto mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3"
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

          {!isScanning && (
            <>
              {activeTab === 'scanner' && (
                scanResult ? (
                  <ComplianceDashboard
                    scanResult={scanResult}
                    isPremium={isPremium}
                    onOpenBadgeGenerator={() => setActiveTab('badge')}
                    onOpenPricing={() => setActiveTab('pricing')}
                    onOpenReport={() => isPremium ? setActiveTab('report') : setShowLeadGen(true)}
                    onOpenAiCounsel={() => setActiveTab('ai-counsel')}
                    onOpenTemplates={() => setActiveTab('templates')}
                  />
                ) : (
                  <LandingPage onStartScan={handleStartScan} isScanning={isScanning} />
                )
              )}

              {activeTab === 'dashboard' && <UserDashboard isPremium={isPremium} />}
              {activeTab === 'audit-hub' && <AuditHub />}
              {activeTab === 'badge' && (
                <BadgeGenerator
                  scanResult={scanResult}
                  onOpenTrustCenter={() => setActiveTab('trust-center')}
                />
              )}
              {activeTab === 'pricing' && (
                <PricingModal isPremium={isPremium} onUpgrade={handlePrototypeUpgrade} />
              )}
              {activeTab === 'report' && scanResult && (
                <PrintableReport
                  scanResult={scanResult}
                  isPremium={isPremium}
                  onBack={() => setActiveTab('scanner')}
                  onUpgrade={() => setActiveTab('pricing')}
                />
              )}
              {activeTab === 'ai-counsel' && (
                <AiCounsel isPremium={isPremium} onUpgrade={() => setActiveTab('pricing')} />
              )}
              {activeTab === 'trust-center' && <PublicTrustCenter scanResult={scanResult} />}
              {activeTab === 'legal-docs' && (
                <DocumentGenerator
                  scanResult={scanResult}
                  isPremium={isPremium}
                  onUpgrade={() => setActiveTab('pricing')}
                />
              )}
              {activeTab === 'templates' && <TemplatesHub />}
              {activeTab === 'integrations' && <IntegrationsHub />}
              {activeTab === 'policy' && <PolicyManager />}
              {activeTab === 'truesight' && (
                <TrueSight isPremium={isPremium} onUpgrade={() => setActiveTab('pricing')} />
              )}
            </>
          )}
        </div>

        {showLeadGen && (
          <LeadGenModal
            onClose={() => setShowLeadGen(false)}
            onSuccess={() => {
              setShowLeadGen(false);
              setActiveTab('report');
            }}
          />
        )}
      </main>

      <footer className="no-print border-t border-border bg-[#09090b] text-zinc-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-black text-sm">G</span>
                </div>
                <span className="font-bold text-zinc-100 text-lg">GuardAI</span>
              </div>
              <p className="text-zinc-500 text-xs leading-relaxed mb-4">
                Technische Compliance-Evidenz und Risikoanalyse für Web-Apps und Repositories. Aktiver Produktaufbau.
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <span>Evidence-first</span>
                <span>·</span>
                <span>Technical screening</span>
                <span>·</span>
                <span>Prototype</span>
              </div>
            </div>

            <div>
              <h4 className="text-zinc-200 font-semibold mb-4 text-xs uppercase tracking-wider">Produkt</h4>
              <ul className="space-y-3">
                <li><button onClick={() => setActiveTab('scanner')} className="hover:text-zinc-100 transition-colors">Scanner</button></li>
                <li><button onClick={() => setActiveTab('ai-counsel')} className="hover:text-zinc-100 transition-colors">AI Counsel</button></li>
                <li><button onClick={() => setActiveTab('legal-docs')} className="hover:text-zinc-100 transition-colors">Smart Docs</button></li>
                <li><button onClick={() => setActiveTab('pricing')} className="hover:text-zinc-100 transition-colors">Preise</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-zinc-200 font-semibold mb-4 text-xs uppercase tracking-wider">Ressourcen</h4>
              <ul className="space-y-3">
                <li><span className="text-zinc-600 cursor-default">Dokumentation</span></li>
                <li><span className="text-zinc-600 cursor-default">API Referenz</span></li>
                <li><span className="text-zinc-600 cursor-default">Changelog</span></li>
                <li><span className="text-zinc-600 cursor-default">Status</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-zinc-200 font-semibold mb-4 text-xs uppercase tracking-wider">Rechtliches</h4>
              <ul className="space-y-3">
                <li><span className="text-zinc-500 cursor-default">Impressum</span></li>
                <li><span className="text-zinc-500 cursor-default">Datenschutzerklärung</span></li>
                <li><span className="text-zinc-500 cursor-default">AGB</span></li>
                <li><span className="text-zinc-500 cursor-default">Kontakt</span></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-zinc-600 text-xs">
              © 2026 GuardAI. Aktiver Produktaufbau.
            </p>
            <div className="flex items-center gap-6 text-xs text-zinc-600">
              <span>Security</span>
              <span>·</span>
              <span>Privacy</span>
              <span>·</span>
              <span>Accessibility</span>
              <span>·</span>
              <span>AI Governance</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
