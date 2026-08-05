import { useState } from 'react';
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
import { generateComplianceScan } from './data/mockScanEngine';
import type { ScanResult } from './types/scanner';

export function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'badge' | 'pricing' | 'report' | 'dashboard' | 'ai-counsel' | 'trust-center' | 'legal-docs' | 'audit-hub' | 'templates' | 'integrations' | 'policy' | 'truesight'>('scanner');
  const [targetUrl, setTargetUrl] = useState<string | File>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showLeadGen, setShowLeadGen] = useState(false);

  const handleStartScan = (target: string | File) => {
    setTargetUrl(target);
    setIsScanning(true);
  };

  const handleScanCompleted = async () => {
    const result = await generateComplianceScan(targetUrl);
    setScanResult(result);
    setIsScanning(false);
    setActiveTab('scanner');
  };

  const handleNewScan = () => {
    setScanResult(null);
    setActiveTab('scanner');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasScanResult={scanResult !== null}
        onNewScan={handleNewScan}
      />

      {/* Global Command Palette */}
      <CommandPalette onNavigate={(tab) => setActiveTab(tab as any)} />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {isScanning && (
          <ScanProgressModal
            url={typeof targetUrl === 'string' ? targetUrl : targetUrl.name}
            onComplete={handleScanCompleted}
          />
        )}

        {/* Tab Content Routing */}
        <div className="flex-1 w-full flex flex-col p-4 md:p-8 overflow-y-auto">
          {!isScanning && (
            <>
              {activeTab === 'scanner' && (
                scanResult 
                  ? <ComplianceDashboard scanResult={scanResult} isPremium={isPremium} onOpenBadgeGenerator={() => setActiveTab('badge')} onOpenPricing={() => setActiveTab('pricing')} onOpenReport={() => isPremium ? setActiveTab('report') : setShowLeadGen(true)} onOpenAiCounsel={() => setActiveTab('ai-counsel')} onOpenTemplates={() => setActiveTab('templates')} /> 
                  : <LandingPage onStartScan={handleStartScan} isScanning={isScanning} />
              )}
              {activeTab === 'dashboard' && <UserDashboard isPremium={isPremium} />}
              {activeTab === 'audit-hub' && <AuditHub />}
              {activeTab === 'badge' && <BadgeGenerator scanResult={scanResult} onOpenTrustCenter={() => setActiveTab('trust-center')} />}
              {activeTab === 'pricing' && <PricingModal isPremium={isPremium} onUpgrade={() => { setIsPremium(true); setActiveTab('scanner'); }} />}
              {activeTab === 'report' && scanResult && <PrintableReport scanResult={scanResult} isPremium={isPremium} onBack={() => setActiveTab('scanner')} onUpgrade={() => setActiveTab('pricing')} />}
              {activeTab === 'ai-counsel' && <AiCounsel isPremium={isPremium} onUpgrade={() => setActiveTab('pricing')} />}
              {activeTab === 'trust-center' && <PublicTrustCenter scanResult={scanResult} />}
              {activeTab === 'legal-docs' && <DocumentGenerator scanResult={scanResult} isPremium={isPremium} onUpgrade={() => setActiveTab('pricing')} />}
              {activeTab === 'templates' && <TemplatesHub />}
              {activeTab === 'integrations' && <IntegrationsHub />}
              {activeTab === 'policy' && <PolicyManager />}
              {activeTab === 'truesight' && <TrueSight isPremium={isPremium} onUpgrade={() => setActiveTab('pricing')} />}
            </>
          )}
        </div>

        {showLeadGen && (
          <LeadGenModal
            onClose={() => setShowLeadGen(false)}
            onSuccess={() => {
              setShowLeadGen(false);
              setActiveTab('report'); // Give them the basic report after email opt-in
            }}
          />
        )}

        {activeTab === 'dashboard' && (
          <UserDashboard isPremium={isPremium} />
        )}

        {activeTab === 'badge' && (
          <BadgeGenerator 
            scanResult={scanResult} 
            onOpenTrustCenter={() => setActiveTab('trust-center')} 
          />
        )}

        {activeTab === 'trust-center' && (
          <PublicTrustCenter scanResult={scanResult} />
        )}

        {activeTab === 'pricing' && (
          <PricingModal
            isPremium={isPremium}
            onUpgrade={() => {
              setIsPremium(true);
              setActiveTab('scanner');
            }}
          />
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
          <AiCounsel
            isPremium={isPremium}
            onUpgrade={() => setActiveTab('pricing')}
          />
        )}

        {activeTab === 'legal-docs' && (
          <DocumentGenerator
            scanResult={scanResult}
            isPremium={isPremium}
            onUpgrade={() => setActiveTab('pricing')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-border bg-[#09090b] text-zinc-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-black text-sm">G</span>
                </div>
                <span className="font-bold text-zinc-100 text-lg">GuardAI</span>
              </div>
              <p className="text-zinc-500 text-xs leading-relaxed mb-4">
                Kontinuierliches Compliance Monitoring für Web-Apps und KI-Systeme. Made in Germany.
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <span>ISO 27001</span>
                <span>·</span>
                <span>DSGVO-konform</span>
                <span>·</span>
                <span>🇩🇪 Hosting</span>
              </div>
            </div>

            {/* Produkt */}
            <div>
              <h4 className="text-zinc-200 font-semibold mb-4 text-xs uppercase tracking-wider">Produkt</h4>
              <ul className="space-y-3">
                <li><button onClick={() => setActiveTab('scanner')} className="hover:text-zinc-100 transition-colors">Scanner</button></li>
                <li><button onClick={() => setActiveTab('ai-counsel')} className="hover:text-zinc-100 transition-colors">AI Legal Counsel</button></li>
                <li><button onClick={() => setActiveTab('legal-docs')} className="hover:text-zinc-100 transition-colors">Rechtstexte</button></li>
                <li><button onClick={() => setActiveTab('pricing')} className="hover:text-zinc-100 transition-colors">Preise</button></li>
              </ul>
            </div>

            {/* Ressourcen */}
            <div>
              <h4 className="text-zinc-200 font-semibold mb-4 text-xs uppercase tracking-wider">Ressourcen</h4>
              <ul className="space-y-3">
                <li><span className="text-zinc-600 cursor-default">Dokumentation</span></li>
                <li><span className="text-zinc-600 cursor-default">API Referenz</span></li>
                <li><span className="text-zinc-600 cursor-default">Blog</span></li>
                <li><span className="text-zinc-600 cursor-default">Changelog</span></li>
              </ul>
            </div>

            {/* Rechtliches */}
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

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-zinc-600 text-xs">
              © 2026 GuardAI Compliance Suite. Alle Rechte vorbehalten.
            </p>
            <div className="flex items-center gap-6 text-xs text-zinc-600">
              <span>BSI IT-Grundschutz</span>
              <span>·</span>
              <span>ISO 42001</span>
              <span>·</span>
              <span>EU AI Act Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
