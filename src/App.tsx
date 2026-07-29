import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { UrlInputHero } from './components/UrlInputHero';
import { ScanProgressModal } from './components/ScanProgressModal';
import { ComplianceDashboard } from './components/ComplianceDashboard';
import { BadgeGenerator } from './components/BadgeGenerator';
import { PricingModal } from './components/PricingModal';
import { PrintableReport } from './components/PrintableReport';
import { UserDashboard } from './components/UserDashboard';
import { LeadGenModal } from './components/LeadGenModal';
import { generateComplianceScan } from './data/mockScanEngine';
import type { ScanResult } from './types/scanner';

export function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'badge' | 'pricing' | 'report' | 'dashboard'>('scanner');
  const [targetUrl, setTargetUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showLeadGen, setShowLeadGen] = useState(false);

  const handleStartScan = (url: string) => {
    setTargetUrl(url);
    setIsScanning(true);
  };

  const handleScanCompleted = () => {
    const result = generateComplianceScan(targetUrl);
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

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {isScanning && (
          <ScanProgressModal
            url={targetUrl}
            onComplete={handleScanCompleted}
          />
        )}

        {activeTab === 'scanner' && (
          <>
            {!scanResult ? (
              <UrlInputHero onStartScan={handleStartScan} isScanning={isScanning} />
            ) : (
              <ComplianceDashboard
                scanResult={scanResult}
                isPremium={isPremium}
                onOpenBadgeGenerator={() => setActiveTab('badge')}
                onOpenPricing={() => setActiveTab('pricing')}
                onOpenReport={() => isPremium ? setActiveTab('report') : setShowLeadGen(true)}
              />
            )}
          </>
        )}

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
          <UserDashboard />
        )}

        {activeTab === 'badge' && (
          <BadgeGenerator scanResult={scanResult} />
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
      </main>

      {/* Footer */}
      <footer className="no-print" style={{ borderTop: '1px solid #27272a', padding: '2rem 1.5rem', textAlign: 'center', backgroundColor: '#09090b', color: '#a1a1aa', fontSize: '0.82rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontWeight: 600, color: '#f4f4f5' }}>GuardAI Compliance Suite</span> — Enterprise Web & AI Scanner
          </div>
          <div>
            Stand: 2026 | ISO 42001 & BSI Richtlinien
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
